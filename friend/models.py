from django.db import models
from django.db.models.fields.related import ForeignKey
from django.utils import timezone
from django.contrib.auth.models import User


""" FriendList model """
class FriendList(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='user')
    friends = models.ManyToManyField(User, blank=True, related_name='friends')
    
    def __str__(self):
        return self.user.username

    def add_friend(self, account):
        if not account in self.friends.all():
            self.friends.add(account)
            self.save()

    def remove_friend(self, account):
        if account in self.friends.all():
            self.friends.remove(account)
            self.save()

    def unfriend(self, removee):
        remover_friends_list = self
        remover_friends_list.remove_friend(removee)

        friends_list = FriendList.objects.get(user=removee)
        friends_list.remove_friend(self.user)

    def is_mutual_friend(self, friend):
        if friend in self.friends.all():
            return True
        return False


""" FriendList model """
class GameList(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='users',null=True)
    games = models.ManyToManyField(User, blank=True, related_name='games',null=True)
    white = models.ForeignKey(User, on_delete=models.CASCADE, related_name='w', null=True)
    black = models.ForeignKey(User, on_delete=models.CASCADE, related_name='b',null=True)
    moves = models.CharField(max_length=1000, default="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
    turn = models.IntegerField(default=1)
    
    def __str__(self):
        return self.user.username

    def add_game(self, account):
        if not account in self.games.all():
            self.games.add(account)
            self.save()

    def remove_game(self, account):
        if account in self.games.all():
            self.games.remove(account)
            self.save()

    def unfriend(self, removee):
        remover_games_list = self
        remover_games_list.remove_game(removee)

        games_list = GameList.objects.get(user=removee)
        games_list.remove_game(self.user)

    def is_mutual_friend(self, friend):
        if friend in self.games.all():
            return True
        return False


""" Friend Request model """
class FriendRequest(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sender')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='receiver')
    is_active = models.BooleanField(blank=True, null=True, default=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.sender.username

    def accept(self):
        # update both sender and receiver friend list
        receiver_friend_list = FriendList.objects.get(user=self.receiver)
        if receiver_friend_list:
            receiver_friend_list.add_friend(self.sender)
            sender_friend_list = FriendList.objects.get(user=self.sender)
            if sender_friend_list:
                sender_friend_list.add_friend(self.receiver)
                self.is_active = False
                self.save()

    def decline(self):
        self.is_active = False
        self.save()

    def cancel(self):
        self.is_active = False
        self.save()


""" Game Request model """
class GameRequest(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='challenger')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='champion')
    is_active = models.BooleanField(blank=True, null=True, default=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.sender.username

    def accept(self):
        # update both sender and receiver friend list
        receiver_friend_list = GameList.objects.get(user=self.receiver)
        if receiver_friend_list:
            receiver_friend_list.add_game(self.sender)
            sender_friend_list = GameList.objects.get(user=self.sender)
            if sender_friend_list:
                sender_friend_list.add_game(self.receiver)
                self.is_active = False
                self.save()

    def decline(self):
        self.is_active = False
        self.save()

    def cancel(self):
        self.is_active = False
        self.save()