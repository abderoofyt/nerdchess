# Generated by Django 4.1.7 on 2023-03-23 10:32

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('friend', '0010_gamelist_games_gamelist_user'),
    ]

    operations = [
        migrations.AlterField(
            model_name='gamelist',
            name='moves',
            field=models.CharField(default='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', max_length=1000),
        ),
    ]
