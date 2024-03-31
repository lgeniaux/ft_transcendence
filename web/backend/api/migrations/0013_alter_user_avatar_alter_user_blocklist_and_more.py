# Generated by Django 4.2.9 on 2024-03-31 18:17

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0012_alter_user_username"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="avatar",
            field=models.ImageField(blank=True, upload_to=""),
        ),
        migrations.AlterField(
            model_name="user",
            name="blocklist",
            field=models.ManyToManyField(
                blank=True, related_name="blocked", to=settings.AUTH_USER_MODEL
            ),
        ),
        migrations.AlterField(
            model_name="user",
            name="friendlist",
            field=models.ManyToManyField(
                blank=True, related_name="friends", to=settings.AUTH_USER_MODEL
            ),
        ),
    ]
