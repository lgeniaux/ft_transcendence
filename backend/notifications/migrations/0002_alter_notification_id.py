# Generated by Django 4.2.9 on 2024-03-22 01:23

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="notification",
            name="id",
            field=models.AutoField(primary_key=True, serialize=False),
        ),
    ]
