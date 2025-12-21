# Visca Barça - Backend API

Backend server for the Visca Barça Hyderabad Peña blog platform.

## 🔵🔴 Features

- User authentication (JWT)
- Role-based access (Admin & User)
- Blog CRUD operations
- Tags system
- PostgreSQL database
- RESTful API

## 🚀 Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your database credentials and JWT secret.

3. **Create PostgreSQL database:**
   ```bash
   createdb viscabarca
   ```

4. **Initialize database:**
   ```bash
   npm run init-db
   ```
   This will create all tables and a default admin user.

5. **Start the server:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Blogs
- `GET /api/blogs` - Get all published blogs (public)
- `GET /api/blogs/slug/:slug` - Get blog by slug (public)
- `GET /api/blogs/admin/all` - Get all blogs including drafts (admin)
- `POST /api/blogs` - Create blog (admin)
- `PUT /api/blogs/:id` - Update blog (admin)
- `DELETE /api/blogs/:id` - Delete blog (admin)
- `GET /api/blogs/tags/all` - Get all tags

## 🔐 Default Admin Credentials

- **Email:** admin@viscabarca.com
- **Password:** admin123

**⚠️ Change these credentials in production!**

## 🗄️ Database Schema

- **users** - User accounts with roles
- **blogs** - Blog posts
- **tags** - Blog categories/tags
- **blog_tags** - Many-to-many relationship
- **comments** - User comments on blogs

## 🔵🔴 Visca el Barça! 🔴🔵
