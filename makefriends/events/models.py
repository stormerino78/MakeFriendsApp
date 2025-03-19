import uuid
from django.db import models
from django.contrib.auth.models import User

class Event(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	title = models.CharField(max_length=255)
	description = models.TextField()
	date = models.DateTimeField()
	latitude = models.FloatField(blank=True, null=True)
	longitude = models.FloatField(blank=True, null=True)
	event_type = models.CharField(max_length=50) #"sport", "online", "cultural", "networking"
	age_range = models.CharField(max_length=20, blank=True, null=True)
	gender_preference = models.CharField(max_length=20, blank=True, null=True)

	organizer = models.ForeignKey(User, on_delete=models.CASCADE)
	def __str__(self):
		return self.title