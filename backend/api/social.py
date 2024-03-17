from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Game, Tournament, TournamentInvitation
from .serializers import GameSerializer, UserRegistrationSerializer, UserLoginSerializer
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication
from rest_framework import serializers
from .serializers import UserSerializer
from notifications.models import Notification
from notifications.views import send_notification
from . import views


User = get_user_model()
class BlockOrUnblockUserSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=50)
    action = serializers.ChoiceField(choices=["block", "unblock"])

    def validate(self, data):
        request_user = self.context['request'].user
        user_to_block = data['username']
        action = data['action']
        user = self.validate_user(request_user, user_to_block)
        data['user'] = user 
        return data
    
    def validate_user(self, request_user, user_to_block):
        try:
            user = User.objects.get(username=user_to_block)
        except User.DoesNotExist:
            raise serializers.ValidationError({"detail": "User does not exist"})
        if user == request_user:
            raise serializers.ValidationError({"detail": "You cannot block/unblock yourself"})
        return user

class BlockOrUnblockUser(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = BlockOrUnblockUserSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.validated_data['user']
            action = serializer.validated_data['action']
            request_user = request.user

            if action == "block":
                if user in request_user.friendlist.all():
                    request_user.friendlist.remove(user)
                if user in request_user.blocklist.all():
                    return Response({"detail": "User is already in your blocklist"}, status=status.HTTP_400_BAD_REQUEST)
                request_user.blocklist.add(user)
                return Response({"detail": "User successfully blocked"}, status=status.HTTP_200_OK)
            elif action == "unblock":
                if user not in request_user.blocklist.all():
                    return Response({"detail": "User is not in your blocklist"}, status=status.HTTP_400_BAD_REQUEST)
                request_user.blocklist.remove(user)
                return Response({"detail": "User successfully unblocked"}, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        

class AddOrDeleteFriendSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=50)
    action = serializers.ChoiceField(choices=["add", "delete"])

    def validate(self, data):
        request_user = self.context['request'].user
        friend_username = data['username']
        action = data['action']
        friend = self.validate_friend(request_user, friend_username)
        data['friend'] = friend  
        return data
    
    def validate_friend(self, request_user, friend_username):
        try:
            friend = User.objects.get(username=friend_username)
        except User.DoesNotExist:
            raise serializers.ValidationError({"detail": "User does not exist"})
        if friend == request_user:
            raise serializers.ValidationError({"detail": "You cannot add/delete yourself"})
        return friend


class AddOrDeleteFriend(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = AddOrDeleteFriendSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            friend = serializer.validated_data['friend']
            action = serializer.validated_data['action']
            request_user = request.user

            if action == "add":
                if friend in request_user.blocklist.all():
                    return Response({"detail": "You cannot add a user to your friendlist if you have blocked them"}, status=status.HTTP_400_BAD_REQUEST)
                if friend in request_user.friendlist.all():
                    return Response({"detail": "User is already in your friendlist"}, status=status.HTTP_400_BAD_REQUEST)
                request_user.friendlist.add(friend)
                return Response({"detail": "User successfully added to your friendlist"}, status=status.HTTP_200_OK)
            elif action == "delete":
                if friend not in request_user.friendlist.all():
                    return Response({"detail": "User is not in your friendlist"}, status=status.HTTP_400_BAD_REQUEST)
                request_user.friendlist.remove(friend)
                return Response({"detail": "User successfully removed from your friendlist"}, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class GetUsersListSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['username', 'avatar', 'online_status', 'status']

    def get_status(self, obj):
        request_user = self.context['request'].user
        if obj in request_user.friendlist.all():
            return 'friends'
        elif obj in request_user.blocklist.all():
            return 'blocked'
        else:
            return 'None'

class GetUsersList(APIView):
    """
    Get a list of all users
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        users = User.objects.all().exclude(id=request.user.id)
        context = {'request': request}
        serializer = GetUsersListSerializer(users, many=True, context=context)
        return Response(serializer.data, status=status.HTTP_200_OK)

# Notifications
    
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'message', 'notification_type', 'created_at', 'data']
    

class GetUserNotifications(APIView):
    """
    Get a list of all notifications for the user
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        notifications = request.user.notifications.all()
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    

class ManageInvitationNotificationSerializer(serializers.Serializer):
    notification_id = serializers.IntegerField()
    action = serializers.ChoiceField(choices=["accept", "deny"])

    def validate(self, data):
        notification_id = data['notification_id']
        action = data['action']
        request_user = self.context['request'].user
        notification = self.validate_notification(notification_id, request_user)
        data['notification'] = notification
        return data

    def validate_notification(self, notification_id, request_user):
        try:
            notification = Notification.objects.get(id=notification_id, recipient=request_user)
        except Notification.DoesNotExist:
            raise serializers.ValidationError({"detail": "Notification does not exist"})
        if notification.notification_type not in ["tournament_invite", "game_invite"]:
            raise serializers.ValidationError({"detail": "Invalid notification type"})
        
        if notification.notification_type == "tournament_invite":
            tournament_invitation = self.validate_tournament_invite(notification, request_user)
            if tournament_invitation.status != "pending":
                raise serializers.ValidationError({"detail": "Invitation is not in a pending state"})
            return notification
        elif notification.notification_type == "game_invite":
            # to do
            pass

    def validate_tournament_invite(self, notification, user):
        tournament_id = notification.data['tournament_id']
        try:
            tournament_invitation = TournamentInvitation.objects.get(tournament_id=tournament_id, user=user)
            return tournament_invitation
        except TournamentInvitation.DoesNotExist:
            raise serializers.ValidationError({"detail": "Tournament invitation does not exist"})



class ManageInvitationNotification(views.APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = ManageInvitationNotificationSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            notification = serializer.validated_data['notification']
            action = serializer.validated_data['action']
            request_user = request.user

            if notification.notification_type == "tournament_invite":
                tournament_invitation = serializer.validate_tournament_invite(notification, request_user)
                if action == "accept":
                    tournament_invitation.status = "accepted"
                    tournament_invitation.save()
                    notification.data['invite_status'] = "accepted"
                    notification.save()
                    return Response({"detail": "Tournament invitation successfully accepted"}, status=status.HTTP_200_OK)
                elif action == "deny":
                    tournament_invitation.status = "denied"
                    tournament_invitation.save()
                    notification.data['invite_status'] = "denied"
                    notification.save()
                    return Response({"detail": "Tournament invitation successfully denied"}, status=status.HTTP_200_OK)
            elif notification.notification_type == "game_invite":
                # to do
                pass
            return Response({"detail": "Action completed successfully"}, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)