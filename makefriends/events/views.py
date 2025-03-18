from rest_framework import viewsets
from .models import Event
from .serializers import EventSerializer

class EventViewSet(viewsets.ModelViewSet):
	queryset = Event.objects.all()
	serializer_class = EventSerializer

	def perform_create(self, serializer):
        # Set the user as the organizer automatically
		serializer.save(organizer=self.request.user)