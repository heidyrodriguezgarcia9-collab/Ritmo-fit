# Ritmo — modelo de datos previsto

users/{uid}: cuenta autenticada con Firebase Authentication.
users/{uid}/profiles/{profileId}: name, type (adult/kids), goals, createdAt.
users/{uid}/profiles/{profileId}/sessions/{sessionId}: routineId, startedAt, completedAt, durationSeconds.
users/{uid}/profiles/{profileId}/routines/{routineId}: name, exerciseIds, settings.
exercises/{exerciseId}: catálogo administrado por la aplicación, con nombre, instrucciones, media y duración por defecto.

## Estado actual
La selección de perfiles y el progreso independiente funcionan en localStorage.
La autenticación y sincronización Firestore todavía NO están conectadas.
Para conectarlas hace falta crear un proyecto Firebase Spark en la cuenta de la propietaria, registrar una aplicación web, habilitar Email/Password y crear Firestore con estas reglas.
No colocar secretos de servidor en el repositorio público.
