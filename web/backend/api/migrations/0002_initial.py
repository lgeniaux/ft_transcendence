# Generated by Django 4.2.9 on 2024-04-04 11:49

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("notifications", "0001_initial"),
        ("api", "0001_initial"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.AddField(
            model_name="tournamentinvitation",
            name="notification",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to="notifications.notification",
            ),
        ),
        migrations.AddField(
            model_name="tournamentinvitation",
            name="participant",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL
            ),
        ),
        migrations.AddField(
            model_name="tournamentinvitation",
            name="tournament",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE, to="api.tournament"
            ),
        ),
        migrations.AddField(
            model_name="tournament",
            name="creator",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="created_tournaments",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="tournament",
            name="invitations",
            field=models.ManyToManyField(blank=True, to="notifications.notification"),
        ),
        migrations.AddField(
            model_name="tournament",
            name="participants",
            field=models.ManyToManyField(blank=True, to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name="livechat",
            name="user",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL
            ),
        ),
        migrations.AddField(
            model_name="game",
            name="player1",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="player1",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="game",
            name="player2",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="player2",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="game",
            name="tournament",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to="api.tournament",
            ),
        ),
        migrations.AddField(
            model_name="game",
            name="winner",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="winner",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="blocklist",
            field=models.ManyToManyField(
                blank=True, related_name="blocked", to=settings.AUTH_USER_MODEL
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="friendlist",
            field=models.ManyToManyField(
                blank=True, related_name="friends", to=settings.AUTH_USER_MODEL
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="groups",
            field=models.ManyToManyField(
                blank=True,
                help_text="The groups this user belongs to. A user will get all permissions granted to each of their groups.",
                related_name="user_set",
                related_query_name="user",
                to="auth.group",
                verbose_name="groups",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="tournaments",
            field=models.ManyToManyField(blank=True, to="api.tournament"),
        ),
        migrations.AddField(
            model_name="user",
            name="user_permissions",
            field=models.ManyToManyField(
                blank=True,
                help_text="Specific permissions for this user.",
                related_name="user_set",
                related_query_name="user",
                to="auth.permission",
                verbose_name="user permissions",
            ),
        ),
    ]
