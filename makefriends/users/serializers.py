from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.gis.geos import Point
from .models import UserProfile, Chat, ChatMessage

class UserProfileSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)  # Add this line
    # Reference the related User model's username and email
    username = serializers.CharField(source='user.username')
    email = serializers.EmailField(source='user.email')
    password = serializers.CharField(source = 'user.password', write_only=True)  # Don't return the password in the response

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
    mood = serializers.CharField(required=False, allow_blank=True)
    # Use a JSONField for incoming location data (write-only)
    location = serializers.JSONField(required=False, write_only=True)
    # And a separate read-only field for output
    location_display = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            "user_id", 
            "username",  # The username from the related User model
            "email",  # The email from the related User model
            "password",  # Password field
            "name", 
            "dateOfBirth_str", 
            "gender", 
            "interests", 
            "personality",
            "why",
            "profile_picture",
            "mood",
            "location",
            "location_display"  # read-only output field
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
        # Username and 
        user_data = validated_data.pop('user')
        username = user_data.pop('username')
        email = user_data.pop('email')
        password = user_data.pop('password')

        # Create the User object with the username, email, and password
        user = User.objects.create_user(username=username, email=email, password=password)

        # Now create the UserProfile object and associate it with the user
        user_profile = UserProfile.objects.create(user=user, **validated_data)

        return user_profile

    def update(self, instance, validated_data):
        # Update location if provided
        location_data = validated_data.pop('location', None)
        if location_data:
            # Expecting a dict like: {"type": "Point", "coordinates": [lon, lat]}
            instance.location = Point(location_data['coordinates'][0], location_data['coordinates'][1])
        return super().update(instance, validated_data)

    def get_location_display(self, instance):
        if instance.location:
            return {"type": "Point", "coordinates": [instance.location.x, instance.location.y]}
        return None
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation.pop("location", None)
        if instance.profile_picture:
            request = self.context.get('request')
            if request:
                representation['profile_picture'] = request.build_absolute_uri(instance.profile_picture.url)
            else:
                representation['profile_picture'] = instance.profile_picture.url
        return representation

# Chat serializer
class ChatSerializer(serializers.ModelSerializer):
    # Return the name of the other participant (if available)
    name = serializers.SerializerMethodField()
    unread = serializers.SerializerMethodField()
    blocked = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = ['id', 'name', 'last_message', 'unread', 'blocked', 'updated_at']

    def get_name(self, obj):
        request = self.context.get('request')
        if request:
            current_user = request.user
            other = obj.participants.exclude(id=current_user.id).first()
            return other.username if other else "Chat"
        return "Chat"

    def get_unread(self, obj):
        request = self.context.get('request')
        if request:
            return obj.unread_by.filter(id=request.user.id).exists()
        return False

    def get_blocked(self, obj):
        request = self.context.get('request')
        if request:
            return obj.blocked_by.filter(id=request.user.id).exists()
        return False
    
class ChatMessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    
    class Meta:
        model = ChatMessage
        fields = ['id', 'chat', 'sender', 'sender_username', 'message', 'created_at']
        read_only_fields = ['id', 'created_at', 'sender']