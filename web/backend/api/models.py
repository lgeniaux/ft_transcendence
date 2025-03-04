from django.db import models

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.postgres.fields import ArrayField
from notifications.models import Notification
from notifications.views import send_notification
from tournaments.views import broadcast_to_tournament_group
import random
from livechat.models import PrivateMessage


class User(AbstractUser):
    username = models.CharField(max_length=20, unique=True)
    email = models.EmailField(max_length=254, unique=True)
    avatar = models.ImageField(blank=True)
    online_status = models.IntegerField(null=True, blank=True)
    friendlist = models.ManyToManyField(
        "self", symmetrical=False, blank=True, related_name="friends"
    )
    blocklist = models.ManyToManyField(
        "self", symmetrical=False, blank=True, related_name="blocked"
    )
    tournaments = models.ManyToManyField("Tournament", blank=True)
    is_oauth = models.BooleanField(default=False)

    def in_active_game(self):
        return (
            Game.objects.filter(models.Q(player1=self) | models.Q(player2=self))
            .filter(status="in progress")
            .exists()
        )

    def update_games_after_account_deletion(self):
        games = Game.objects.filter(
            models.Q(player1=self) | models.Q(player2=self)
        ).exclude(status="finished")
        for game in games:
            if game.player1 == self:
                game.winner = game.player2
                game.score_player1 = 0
                game.score_player2 = 5
            else:
                game.winner = game.player1
                game.score_player1 = 5
                game.score_player2 = 0
            game.status = "finished"
            game.save()

    def update_notifications_after_account_deletion(self):
        notifications = Notification.objects.filter(recipient=self).exclude(
            notification_type="friend-request"
        )
        for notification in notifications:
            notification.data["status"] = "denied"
            notification.save()

    def delete_sent_messages(self):
        messages = PrivateMessage.objects.filter(sender=self)
        for message in messages:
            message.delete()


class Game(models.Model):
    def __str__(self):
        return f"{self.player1} vs {self.player2}"

    game_id = models.AutoField(primary_key=True)
    player1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name="player1")
    player2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name="player2")
    score_player1 = models.IntegerField(default=0)
    score_player2 = models.IntegerField(default=0)
    winner = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="winner", null=True, blank=True
    )
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    tournament = models.ForeignKey(
        "Tournament", on_delete=models.CASCADE, null=True, blank=True
    )
    round_name = models.CharField(max_length=50, null=True, blank=True)
    status = models.CharField(max_length=50, default="waiting for player2")


class Tournament(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=20, unique=True)
    creator = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="created_tournaments"
    )
    invitations = models.ManyToManyField(Notification, blank=True)
    participants = models.ManyToManyField(User, blank=True)
    start_time = models.DateTimeField(auto_now_add=True)
    state = models.JSONField(default=dict)
    nb_players = models.IntegerField()

    def initialize_state(self):
        state = {}
        state["quarter-finals"] = []
        state["semi-finals"] = []
        state["finals"] = []
        state["winner"] = None
        state["status"] = "waiting for all participants to join"
        state["round_name"] = "quarter-finals" if self.nb_players > 4 else "semi-finals"
        self.state = state
        self.save()

    def start_tournament(self):
        if self.state["status"] != "waiting for all participants to join":
            raise ValueError("Tournament is not ready to start.")

        participants = list(self.participants.all())
        if len(participants) != self.nb_players:
            raise ValueError(
                "Tournament participants count does not match the expected number of players."
            )

        random.shuffle(participants)

        games = [participants[i : i + 2] for i in range(0, len(participants), 2)]

        for index, game in enumerate(games):
            player1, player2 = game
            new_game = Game.objects.create(
                player1=player1,
                player2=player2,
                tournament=self,
                round_name="quarter-finals" if self.nb_players > 4 else "semi-finals",
                status="waiting to start",
            )

            for player in game:
                send_notification(
                    recipient=player,
                    message=f"You have a new game in the tournament: {self.name}",
                    notification_type="tournament-game",
                    data={
                        "game_id": new_game.game_id,
                        "tournament_id": self.id,
                        "round_name": new_game.round_name,
                        "status": "pending",
                    },
                )

            game_data = {
                "game_id": new_game.game_id,
                "player1": player1.username,
                "player2": player2.username,
                "status": new_game.status,
            }
            self.state[
                "quarter-finals" if self.nb_players > 4 else "semi-finals"
            ].append(game_data)

        broadcast_to_tournament_group(self.id, "Tournament has started.")
        self.state["status"] = "in progress"
        self.save()

    def get_game_to_play(self, user):
        """
        Return the Game object that the user needs to play in the current round.
        Can be None if the user is disqualified, if there's no game to play, or if the tournament isn't in progress.
        """
        if self.state["status"] != "in progress":
            return None

        for round_name in ["quarter-finals", "semi-finals", "finals"]:
            game = Game.objects.filter(
                models.Q(player1=user) | models.Q(player2=user),
                tournament=self,
                round_name=round_name,
                status="waiting to start",
            ).first()

            if game:
                return game.game_id
        return None

    def check_round_completion(self):
        if self.state["status"] != "in progress":
            return
        self.update_state()

        current_round = self.state["round_name"]
        current_round_games = self.state[current_round]

        if all(
            Game.objects.filter(game_id=game["game_id"], status="finished").exists()
            for game in current_round_games
        ):
            if current_round == "quarter-finals":
                self.prepare_next_round("semi-finals")
            elif current_round == "semi-finals":
                self.prepare_next_round("finals")
            elif current_round == "finals":
                final_game = Game.objects.get(game_id=current_round_games[0]["game_id"])
                self.state["winner"] = final_game.winner.username
                self.state["status"] = "finished"
                broadcast_to_tournament_group(self.id, f"Tournament has ended")
                self.save()

    def prepare_next_round(self, next_round):
        """
        Prepare games for the next round of the tournament.
        """
        winners = []
        for game_data in self.state[self.state["round_name"]]:
            game = Game.objects.get(game_id=game_data["game_id"])
            winners.append(game.winner)

        random.shuffle(winners)
        games = [winners[i : i + 2] for i in range(0, len(winners), 2)]
        next_round_games = []

        for game in games:
            player1, player2 = game
            new_game = Game.objects.create(
                player1=player1,
                player2=player2,
                tournament=self,
                round_name=next_round,
                status="waiting to start",
            )
            next_round_games.append(
                {
                    "game_id": new_game.game_id,
                    "player1": player1.username,
                    "player2": player2.username,
                    "status": new_game.status,
                }
            )

            for player in game:
                send_notification(
                    recipient=player,
                    message=f"Your next game in the tournament: {self.name} is ready.",
                    notification_type="tournament-game",
                    data={
                        "game_id": new_game.game_id,
                        "tournament_id": self.id,
                        "round_name": new_game.round_name,
                        "status": "pending",
                    },
                )

        self.state[next_round] = next_round_games
        self.state["round_name"] = next_round
        self.save()
        broadcast_to_tournament_group(self.id, f"{next_round} has started.")

    def update_state(self):
        for round_name in ["quarter-finals", "semi-finals", "finals"]:
            for game_data in self.state[round_name]:
                game = Game.objects.get(game_id=game_data["game_id"])
                game_data["status"] = game.status
                game_data["score_player1"] = game.score_player1
                game_data["score_player2"] = game.score_player2
                game_data["player1"] = game.player1.username
                game_data["player2"] = game.player2.username
                game_data["winner"] = game.winner.username if game.winner else None
        self.save()


class TournamentInvitation(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE)
    participant = models.ForeignKey(User, on_delete=models.CASCADE)
    notification = models.ForeignKey(
        Notification, on_delete=models.SET_NULL, null=True, blank=True
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("accepted", "Accepted"),
            ("declined", "Declined"),
        ],
    )


class LiveChat(models.Model):
    def __str__(self):
        return f"{self.user} : {self.message}"

    chat_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.CharField(max_length=100)
    time = models.DateTimeField(auto_now_add=True)
