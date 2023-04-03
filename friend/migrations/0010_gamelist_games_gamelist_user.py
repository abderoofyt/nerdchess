# Generated by Django 4.1.7 on 2023-03-23 10:29

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('friend', '0009_remove_gamelist_games_remove_gamelist_user_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='gamelist',
            name='games',
            field=models.ManyToManyField(blank=True, null=True, related_name='games', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='gamelist',
            name='user',
            field=models.OneToOneField(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='users', to=settings.AUTH_USER_MODEL),
        ),
    ]
