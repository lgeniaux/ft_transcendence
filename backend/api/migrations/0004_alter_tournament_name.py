# Generated by Django 4.2.9 on 2024-03-15 23:01

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0003_game_round_name_game_tournament_tournament_creator_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="tournament",
            name="name",
            field=models.CharField(max_length=50, unique=True),
        ),
    ]
