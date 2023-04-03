from django.contrib import admin
from friend.models import FriendList, FriendRequest, GameList, GameRequest

admin.site.register(FriendList)
admin.site.register(FriendRequest)
admin.site.register(GameList)
admin.site.register(GameRequest)
