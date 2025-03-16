from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile

class UserProfileSerializer(serializers.ModelSerializer):
    # Reference the related User model's username and email
    username = serializers.ReadOnlyField(source='user.username')
    email = serializers.ReadOnlyField(source='user.email')
    password = serializers.CharField(write_only=True)  # Don't return the password in the response

    # Map the front-end field "dateOfBirth_str" to the model field "date_of_birth". Allows incoming strings (like "2025-01-01") to be automatically parsed into a date, and when serializing output
    dateOfBirth_str = serializers.DateField(
        format="%Y-%m-%d",
        input_formats=["%Y-%m-%d"]
    )
    profile_picture = serializers.ImageField(required=False, allow_null=True)
    # Mark interest and why text fields as optional
    interests = serializers.CharField(required=False, allow_blank=True)
    why = serializers.CharField(required=False, allow_blank=True)
    personality = serializers.CharField(required=False, allow_blank=True)
    

    class Meta:
        model = UserProfile
        fields = [
            "username",  # The username from the related User model
            "email",  # The email from the related User model
            "password",  # Password field
            "name", 
            "dateOfBirth_str", 
            "gender", 
            "interests", 
            "personality",
            "why",
            "profile_picture"
        ]

    def validate_username(self, value):
        """Ensure the username is unique"""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_email(self, value):
        """Ensure the email is unique"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value
    
    def create(self, validated_data):
        # Pop the username, email, and password to create the User object
        username = validated_data.pop('username')
        password = validated_data.pop('password')
        email = validated_data.pop('email')

        # Create the User object with the username, email, and password
        user = User.objects.create_user(username=username, email=email, password=password)

        # Now create the UserProfile object and associate it with the user
        user_profile = UserProfile.objects.create(user=user, **validated_data)

        return user_profile

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.profile_picture:
            request = self.context.get('request')
            if request:
                representation['profile_picture'] = request.build_absolute_uri(instance.profile_picture.url)
            else:
                representation['profile_picture'] = instance.profile_picture.url
        return representation
