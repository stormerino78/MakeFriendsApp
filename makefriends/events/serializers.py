from rest_framework import serializers
from .models import Event

class EventSerializer(serializers.ModelSerializer):
    organizer = serializers.ReadOnlyField(source="organizer.username")

    class Meta:
        model = Event
        fields = ["id", "title", "description", "date", "location", "organizer", "type", "age_range", "gender_preference"]
