# Backend for LoRa Monitoring

This backend uses Express and MySQL to store device and sensor data.

## New user/ownership support

- Added `users` table and a `user_id` column on `devices`.
- Devices are now scoped to the authenticated user.
- Authentication is performed using JWTs (`jsonwebtoken`) and passwords hashed with `bcryptjs`.
- Endpoints requiring a logged-in user are protected with the `authenticateToken` middleware.

### Key endpoints

| Path | Method | Description |
|------|--------|-------------|
| `/api/register` | POST | create new account (`{username,password}`) |
| `/api/login` | POST | obtain JWT (`{username,password}`) |
| other `/api/*` devices/data endpoints | various | require `Authorization: Bearer <token>` header and only return data owned by that user |

### Database changes

Run `backend/setup_database.sql` to build the schema. It now contains an example user with hashed password (replace placeholder hash). If you have an existing database, you can alter it:

```sql
ALTER TABLE devices ADD COLUMN user_id INT NOT NULL DEFAULT 1;
ALTER TABLE devices ADD FOREIGN KEY (user_id) REFERENCES users(id);
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Dependencies

After pulling the latest changes run:

```bash
cd backend
npm install
```

It will add `bcryptjs` and `jsonwebtoken` along with previously existing packages.

## Running

1. Ensure MySQL is running and the `lora_monitoring` database exists.
2. Execute `setup_database.sql` (replace the sample user password hash).
3. Start with `npm start`.

The server listens on port 5000.


