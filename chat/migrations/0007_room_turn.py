# Generated by Django 4.1.7 on 2023-03-25 16:47

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('chat', '0006_auto_20210215_2113'),
    ]

    operations = [
        migrations.AddField(
            model_name='room',
            name='turn',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, related_name='turn_room', to=settings.AUTH_USER_MODEL),
            preserve_default=False,
        ),
    ]
