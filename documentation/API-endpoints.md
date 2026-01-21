# Documentación de la API

Base URL: `http://localhost:3000/api`

## Autenticación

Todos los endpoints protegidos requieren un Access Token en el header:

```
Authorization: Bearer <access_token>
```

### Manejo del `deviceId`

El `deviceId` identifica de forma única el dispositivo o navegador del usuario, permitiendo gestionar múltiples sesiones simultáneas.

**Mobile (Android/iOS):**
- Usar identificadores nativos del dispositivo (Android ID, IDFV, etc.)

**Web:**
Se recomienda generar un UUID y almacenarlo en `localStorage` para persistencia entre sesiones:

```javascript
function getDeviceId() {
  const STORAGE_KEY = 'deviceId'
  let deviceId = localStorage.getItem(STORAGE_KEY)

  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, deviceId)
  }

  return deviceId
}

// Uso en login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'web'
  },
  credentials: 'include', // Importante para cookies
  body: JSON.stringify({
    email: 'usuario@ejemplo.com',
    password: 'contraseña123',
    deviceId: getDeviceId()
  })
})
```

**Consideraciones:**
- El `deviceId` se pierde si el usuario limpia el localStorage o usa modo incógnito
- En modo incógnito se generará un nuevo `deviceId` por sesión
- Si se requiere mayor persistencia, considerar librerías de fingerprinting como [FingerprintJS](https://fingerprint.com/)

---

### POST `/api/auth/login`

Iniciar sesión y obtener tokens de autenticación.

**Headers:**
```
Content-Type: application/json
X-Client-Type: web | mobile
```

**Request Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123",
  "deviceId": "identificador_del_dispositivo"
}
```

**Response 200:**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "uuid-refresh-token",  // Solo para mobile
  "user": {
    "userId": 1,
    "email": "usuario@ejemplo.com",
    "names": "Juan",
    "lastnames": "Pérez",
    "role": "user"
  }
}
```

- **Web**: El refreshToken se envía como cookie httpOnly
- **Mobile**: El refreshToken se devuelve en el JSON

**Errores:**
- `400` - Credenciales inválidas
- `401` - Email o contraseña incorrectos

---

### POST `/api/auth/refresh`

Refrescar Access Token usando un Refresh Token válido.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <current_access_token>
X-Client-Type: web | mobile
```

**Request Body (mobile):**
```json
{
  "refreshToken": "uuid-refresh-token"
}
```

**Response 200:**
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "nuevo-uuid-refresh-token"  // Solo para mobile
}
```

**Errores:**
- `401` - Refresh Token inválido o expirado
- `403` - Refresh Token revocado

---

### POST `/api/auth/logout`

Cerrar sesión y revocar tokens.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "message": "Logout successful"
}
```

---

### POST `/api/auth/sendRecovery`

Enviar código de recuperación por email.

**Request Body:**
```json
{
  "email": "usuario@ejemplo.com"
}
```

**Response 200:**
```json
{
  "message": "Se ha enviado un código de recuperación a su correo electrónico."
}
```

El código tiene 6 dígitos y es válido por 15 minutos.

---

### POST `/api/auth/verifyCode`

Verificar código de recuperación.

**Request Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "code": "123456"
}
```

**Response 200:**
```json
{
  "message": "Código verificado correctamente",
  "recoverToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

El `recoverToken` es válido por 15 minutos.

---

### POST `/api/auth/recoverPassword`

Reestablecer contraseña usando el token de recuperación.

**Headers:**
```
Authorization: Bearer <recover_token>
```

**Request Body:**
```json
{
  "password": "nueva_contraseña_segura"
}
```

**Response 200:**
```json
{
  "message": "Contraseña reestablecida correctamente"
}
```

---

## Usuarios

### POST `/api/user/`

Registrar nuevo usuario (endpoint público).

**Request Body:**
```json
{
  "email": "nuevo@ejemplo.com",
  "names": "María",
  "lastnames": "García López",
  "password": "contraseña123",
  "phoneNumber": "12345678",
  "phoneCode": "+502",
  "birthdate": "2000-05-15"
}
```

**Validaciones:**
- `email`: Formato de email válido
- `password`: Mínimo 8 caracteres
- `phoneNumber`: Solo números
- `phoneCode`: Formato +XXX o +XXX-XXX
- `birthdate`: Formato YYYY-MM-DD (opcional)

**Response 201:**
```json
{
  "message": "Usuario creado exitosamente",
  "userId": 2
}
```

**Errores:**
- `400` - Datos inválidos o email ya registrado

---

### GET `/api/user/logged`

Obtener datos del usuario autenticado.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "user": {
    "userId": 1,
    "email": "usuario@ejemplo.com",
    "names": "Juan",
    "lastnames": "Pérez",
    "birthdate": "1990-01-15",
    "phoneCode": "+502",
    "phoneNumber": "12345678",
    "role": "user"
  }
}
```

---

### PUT `/api/user/:userId`

Actualizar perfil de usuario.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body (todos los campos son opcionales):**
```json
{
  "names": "Juan Carlos",
  "lastnames": "Pérez Gómez",
  "birthdate": "1990-01-15",
  "phoneCode": "+502",
  "phoneNumber": "87654321"
}
```

**Response 200:**
```json
{
  "message": "Usuario actualizado exitosamente"
}
```

**Errores:**
- `403` - No autorizado para actualizar este usuario
- `404` - Usuario no encontrado

---

## Chats

### POST `/api/chat/`

Crear nuevo chat.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "Consulta sobre trámites"
}
```

**Response 201:**
```json
{
  "message": "Chat creado exitosamente",
  "chat": {
    "chatId": 5,
    "userId": 1,
    "nombre": "Consulta sobre trámites",
    "fechaInicio": "2026-01-12T10:30:00.000Z"
  }
}
```

---

### GET `/api/chat/`

Obtener lista de chats del usuario con paginación.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (opcional): Número de página (default: 1)

**Response 200:**
```json
{
  "chats": [
    {
      "chatId": 5,
      "userId": 1,
      "nombre": "Consulta sobre trámites",
      "fechaInicio": "2026-01-12T10:30:00.000Z",
      "lastMessageContent": "¿Cómo solicito mi DPI?",
      "lastMessageTimestamp": "2026-01-12T10:45:00.000Z",
      "lastMessageSource": "user"
    },
    {
      "chatId": 4,
      "userId": 1,
      "nombre": "Información general",
      "fechaInicio": "2026-01-10T15:20:00.000Z",
      "lastMessageContent": "Gracias por la información",
      "lastMessageTimestamp": "2026-01-10T15:35:00.000Z",
      "lastMessageSource": "user"
    }
  ],
  "currentPage": 1,
  "totalPages": 3,
  "totalChats": 25
}
```

Por defecto se muestran 10 chats por página.

---

## Mensajes

### POST `/api/message/:chatId`

Crear mensaje de usuario en un chat existente.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "content": "¿Cómo solicito mi DPI?"
}
```

**Response 201:**
```json
{
  "message": "Mensaje creado exitosamente",
  "messageId": 42
}
```

---

### POST `/api/message/`

Crear mensaje sin chatId (para mensajes no asignados a chat).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "content": "¿Qué trámites puedo hacer en línea?"
}
```

**Response 201:**
```json
{
  "message": "Mensaje creado exitosamente",
  "messageId": 43
}
```

---

### GET `/api/message/:chatId`

Obtener mensajes de un chat con paginación.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (opcional): Número de página (default: 1)

**Response 200:**
```json
{
  "messages": [
    {
      "messageId": 42,
      "chatId": 5,
      "source": "user",
      "content": "¿Cómo solicito mi DPI?",
      "timestamp": "2026-01-12T10:45:00.000Z",
      "reference": null,
      "responseTime": null
    },
    {
      "messageId": 43,
      "chatId": 5,
      "source": "assistant",
      "content": "Para solicitar tu DPI debes...",
      "timestamp": "2026-01-12T10:45:03.250Z",
      "reference": "Documento: Guía de trámites DPI",
      "responseTime": 3250
    }
  ],
  "currentPage": 1,
  "totalPages": 2,
  "totalMessages": 35
}
```

Por defecto se muestran 20 mensajes por página.

---

### GET `/api/message/response/:chatId`

Obtener respuesta de IA para una pregunta en un chat existente.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `question`: La pregunta del usuario

**Request:**
```
GET /api/message/response/5?question=¿Cómo%20renuevo%20mi%20licencia?
```

**Response 200:**
```json
{
  "response": "Para renovar tu licencia de conducir debes presentarte a...",
  "reference": "Documento: Manual de licencias de conducir",
  "responseTime": 2450
}
```

Este endpoint:
1. Obtiene historial del chat y resumen
2. Calcula edad del usuario
3. Invoca servicio Python de IA
4. Genera respuesta basada en documentos indexados
5. Guarda mensaje del asistente en BD
6. Actualiza resumen del chat
7. Retorna respuesta al usuario

---

### GET `/api/message/response/`

Obtener respuesta de IA sin chatId.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `question`: La pregunta del usuario

**Request:**
```
GET /api/message/response/?question=¿Qué%20es%20el%20DPI?
```

**Response 200:**
```json
{
  "response": "El DPI (Documento Personal de Identificación) es...",
  "reference": "Documento: Guía básica de documentos",
  "responseTime": 1850
}
```

---

### PUT `/api/message/:messageId/:chatId`

Asignar un mensaje a un chat.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "message": "Mensaje asignado al chat exitosamente"
}
```

Útil para asignar mensajes previamente creados sin chat a un chat específico.

---

## Documentos

**Nota:** Todos los endpoints de documentos requieren rol de administrador.

### POST `/api/document/`

Subir documento para procesamiento e indexación (solo admin).

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Form Data:**
```
file: [archivo PDF]
title: "Guía de trámites DPI"
author: "Ministerio de Gobernación"
year: "2024"
minAge: "18"
maxAge: "100"
```

**Response 202:**
```json
{
  "message": "Documento aceptado para procesamiento. Se le notificará por correo cuando esté listo."
}
```

El procesamiento ocurre en segundo plano:
1. Carga archivo a S3
2. Copia a directorio temporal
3. Invoca servicio Python para procesamiento
4. Extrae texto y categoría
5. Genera embeddings y guarda en Pinecone
6. Guarda metadata en base de datos
7. Envía email de confirmación al admin

**Errores:**
- `403` - No autorizado (requiere rol admin)
- `400` - Archivo inválido o faltan campos

---

### GET `/api/document/`

Obtener lista de documentos almacenados (solo admin).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "documents": [
    {
      "documentId": 1,
      "userId": 1,
      "category": 2,
      "categoryDescription": "Identificación",
      "document_url": "https://bucket.s3.amazonaws.com/doc1.pdf",
      "presigned_url": "https://bucket.s3.amazonaws.com/doc1.pdf?X-Amz-Signature=...",
      "title": "Guía de trámites DPI",
      "author": "Ministerio de Gobernación",
      "year": 2024
    }
  ]
}
```

Las URLs presignadas son válidas por 1 hora.

---

### DELETE `/api/document/:documentId`

Eliminar documento (solo admin).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response 202:**
```json
{
  "message": "Documento eliminado exitosamente. Se le notificará por correo cuando se complete."
}
```

El proceso de eliminación ocurre en segundo plano:
1. Elimina archivo de S3
2. Elimina registros de Pinecone
3. Elimina registro de base de datos
4. Envía email de confirmación

**Errores:**
- `403` - No autorizado (requiere rol admin)
- `404` - Documento no encontrado
