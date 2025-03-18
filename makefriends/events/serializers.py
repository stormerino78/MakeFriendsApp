from rest_framework import serializers
from .models import Event

class EventSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True) # auto-generated, not required in request

    class Meta:
        model = Event
        fields = [
            'id',
            'title',
            'description',
            'date',
            'latitude',
            'longitude',
            'event_type',
            'organizer',
            'age_range',
            'gender_preference'
        ]

        read_only_fields = ['organizer']