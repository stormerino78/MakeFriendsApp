from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.gis.measure import Distance
from django.contrib.gis.db.models.functions import Distance as DistanceFunc
from django.contrib.auth.models import User
from rest_framework.generics import ListAPIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import UserProfile, Chat, ChatMessage
from .serializers import UserProfileSerializer, ChatSerializer, ChatMessageSerializer

class UserRegistrationView(APIView):
    permission_classes = [AllowAny]  # Allow unauthenticated users to register
    
    def post(self, request):
        # Deserialize the request data
        serializer = UserProfileSerializer(data=request.data, context={'request': request})

        # Validate and save the data if it"s valid
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User created successfully."}, status=status.HTTP_201_CREATED)
        
        # If data is invalid, return a bad request response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]  # Only logged-in users can access
    # Add the parsers to handle both JSON and multipart/form-data
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def retrieve(self, request, pk=None):
        """
        Retrieve the authenticated user's profile.
        Expect URL: /api/users/me/
        """
        # Allow only "me" as pk for current user.
        if pk != 'me':
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        # Ensure a profile exists.
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(profile, context={'request': request})
        print(serializer.data)
        return Response(serializer.data)

    def partial_update(self, request, pk=None):
        """
        Update parts of the authenticated user's profile.
        Expect URL: /api/users/me/
        """
        if pk != 'me':
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class NearbyUsersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get the current user's profile and its location.
        try:
            profile, _ = UserProfile.objects.get_or_create(user=request.user)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        if not profile.location:
            return Response({"detail": "Current user location is not set."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the search radius from the query parameters, default to 5 km. (GET /api/users/nearby/?radius=10)
        radius_param = request.query_params.get('radius', 5)
        try:
            search_radius = float(radius_param)
        except ValueError:
            search_radius = 5

        # Use GeoDjango filtering:
        nearby_profiles = UserProfile.objects.filter(
            location__distance_lte=(profile.location, Distance(km=search_radius))
        ).exclude(user=request.user).annotate(
            distance=DistanceFunc('location', profile.location)
        ).order_by('distance')
        
        # Optionally filter by mood if your frontend requires that logic;
        # For instance, if the current user’s mood is set and you only want to show profiles with a matching mood:
        if profile.mood:
            nearby_profiles = nearby_profiles.filter(mood__iexact=profile.mood)

        serializer = UserProfileSerializer(nearby_profiles, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

class ChatHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        chats = Chat.objects.filter(participants=request.user).order_by('-updated_at')
        serializer = ChatSerializer(chats, many=True, context={'request': request})
        return Response(serializer.data)

class PokeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Expect the payload to have target_id: the ID of the user to poke (Alice)
        target_id = request.data.get('target_id')
        if not target_id:
            return Response({"error": "target_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target_user = User.objects.get(id=target_id)
        except User.DoesNotExist:
            return Response({"error": "Target user not found"}, status=status.HTTP_404_NOT_FOUND)
        
        poking_user = request.user  # Bob
        
        # Create a Chat if one doesn't already exist
        chat = Chat.objects.filter(participants=poking_user).filter(participants=target_user).first()
        if not chat:
            chat = Chat.objects.create()
            chat.participants.add(poking_user, target_user)
        
        # Here you would normally trigger a notification mechanism (push, websocket, etc.)
        # For demonstration, we simply log the action.
        print(f"Notification: {poking_user.username} poked {target_user.username}")
        
        return Response({"message": f"{poking_user.username} poked {target_user.username}", "chat_id": str(chat.id)}, status=status.HTTP_200_OK)
    
def lockout(request, credentials, *args, **kwargs):
    return Response(
        {"detail": "Your account has been locked due to too many failed login attempts. Please try again later."},
        status=status.HTTP_403_FORBIDDEN
    )

class ChatMessageListView(ListAPIView):
    serializer_class = ChatMessageSerializer

    def get_queryset(self):
        chat_id = self.kwargs.get('chat_id')
        return ChatMessage.objects.filter(chat_id=chat_id).order_by('-created_at')