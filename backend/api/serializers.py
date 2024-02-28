from rest_framework import serializers
from .models import User, Game, LiveChat
from django.contrib.auth.hashers import make_password
from django.contrib.auth import authenticate
import re
from rest_framework.authtoken.models import Token


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['user_id', 'username', 'email', 'avatar', 'online_status']

class GameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = ['game_id', 'player1', 'player2', 'score_player1', 'score_player2', 'winner', 'start_time', 'end_time']

class LiveChatSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiveChat
        fields = ['chat_id', 'user', 'message', 'time']
    
class UserLoginSerializer(serializers.Serializer):
    email = serializers.CharField()
    password = serializers.CharField(style={'input_type': 'password'}, write_only=True)

    def validate(self, data):
        email = data.get("email")
        password = data.get("password")

        if email is None:
            raise serializers.ValidationError("An email is required to log in.")
        if password is None:
            raise serializers.ValidationError("A password is required to log in.")
        else:
            data = {
                'email': email,
                'password': password
            }
        return data
    
class UserRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email', 'password']
    
    def create(self, validated_data):
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            password=make_password(validated_data['password'])
        )
        return user

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        # check the regex for email
        email_regex = r"(^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$)"
        if not re.match(email_regex, value):
            raise serializers.ValidationError("Enter a valid email address.")
        return value
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        # username must be at least 5 characters long, and contain only alphanumeric characters, and no spaces, and no special characters
        if len(value) < 5:
            raise serializers.ValidationError("Username must be at least 5 characters long.")
        if not value.isalnum():
            raise serializers.ValidationError("Username must contain only alphanumeric characters.")
        return value
    
    def validate_password(self, value):
        # password must be at least 8 characters long, and contain at least one uppercase letter, one lowercase letter, one digit, and one special character
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if not any(char.isupper() for char in value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not any(char.islower() for char in value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError("Password must contain at least one digit.")
        if not any(not char.isalnum() for char in value):
            raise serializers.ValidationError("Password must contain at least one special character.")
        return value
    

