from django.db import models
from django.contrib.auth.models import User
from django.contrib.gis.db import models as geomodels

MOOD_CHOICES = [
    ('casual chat', 'Casual chat'),
    ('deep talk', 'Looking for a deep talk'),
    ('activity partner', 'Activity partner'),
    ('networking', 'Networking'),
    ('new to town', 'New to town'),
]

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')  # Correctly link to the User model
    name = models.CharField(max_length=50)
    dateOfBirth_str = models.DateField(max_length=50)
    gender = models.CharField(max_length=10)
    interests = models.TextField(blank=True, null=True)
    personality = models.TextField(blank=True, null=True)
    why = models.TextField(blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    mood = models.CharField(max_length=50, choices=MOOD_CHOICES, blank=True, null=True)
    # New geospatial field to store location.
    location = geomodels.PointField(null=True, blank=True, srid=4326)

    def __str__(self):
        return self.user.username  # Using the related User model's username

# Simple Chat model
class Chat(models.Model):
    participants = models.ManyToManyField(User)
    last_message = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Many-to-many fields to track which users haven't read the chat or have blocked it.
    unread_by = models.ManyToManyField(User, related_name='unread_chats', blank=True)
    blocked_by = models.ManyToManyField(User, related_name='blocked_chats', blank=True)

    def __str__(self):
        return f"Chat {self.id}"