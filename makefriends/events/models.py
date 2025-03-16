from django.db import models
from django.contrib.auth.models import User

class Event(models.Model):
	id = models.IntegerField(primary_key=True)
	title = models.CharField(max_length=255)
	description = models.TextField()
	date = models.DateTimeField()
	location = models.CharField(max_length=255)
	organizer = models.ForeignKey(User, on_delete=models.CASCADE)
	type = models.CharField(max_length=50)
	age_range = models.CharField(max_length=20)
	gender_preference = models.CharField(max_length=20)
