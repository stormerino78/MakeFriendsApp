from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')  # Correctly link to the User model
    name = models.CharField(max_length=50)
    dateOfBirth_str = models.DateField(max_length=50)
    gender = models.CharField(max_length=10)
    interests = models.TextField(blank=True, null=True)
    personality = models.TextField(blank=True, null=True)
    why = models.TextField(blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)

    def __str__(self):
        return self.user.username  # Using the related User model's username
