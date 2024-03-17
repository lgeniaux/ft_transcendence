# Generated by Django 4.2.9 on 2024-03-16 16:21

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0002_notification_data"),
        ("api", "0004_alter_tournament_name"),
    ]

    operations = [
        migrations.AddField(
            model_name="tournament",
            name="invitations_sent",
            field=models.ManyToManyField(
                blank=True,
                related_name="invitations_sent",
                to="notifications.notification",
            ),
        ),
    ]
