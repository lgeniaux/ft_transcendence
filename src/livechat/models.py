from django.db import models
from django.contrib.auth.models import AbstractUser

class Message(models.Model):
	author = models.ForeignKey('api.User', on_delete=models.CASCADE)
	content = models.CharField(max_length=255)
	timestamp = models.DateTimeField(auto_now_add=True)
