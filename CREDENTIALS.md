# EC Exhibits Portal - Login Credentials

## Demo User Accounts

All demo accounts use the password: **`password123`**

### Owner Role
- **Email:** olivia@ecexhibits.com
- **Password:** password123
- **Access:** Full system access, can manage users, projects, templates

### Staff Members
1. **Samuel Staff**
   - **Email:** samuel@ecexhibits.com
   - **Password:** password123
   - **Access:** Can manage projects, tasks, and files

2. **Skyler Staff**
   - **Email:** skyler@ecexhibits.com
   - **Password:** password123
   - **Access:** Can manage projects, tasks, and files

### Client Users
1. **Cameron Client**
   - **Email:** cameron@client.com
   - **Password:** password123
   - **Access:** View assigned projects, upload files, send messages

2. **Callie Client**
   - **Email:** callie@client.com
   - **Password:** password123
   - **Access:** View assigned projects, upload files, send messages

---

## Role Capabilities

### Owner
- ✅ Create and manage projects
- ✅ Invite/remove team members
- ✅ Manage templates
- ✅ View all projects
- ✅ Full admin access

### Staff
- ✅ Manage assigned projects
- ✅ Update task status
- ✅ Upload/manage files
- ✅ Chat with clients
- ❌ Cannot create projects
- ❌ Cannot manage users

### Client
- ✅ View assigned projects
- ✅ Upload requested files
- ✅ Chat with team
- ✅ View invoices
- ❌ Cannot update tasks
- ❌ Cannot manage stages
- ❌ Limited access

---

## Testing Recommendations

1. **Start as Owner** - Get familiar with all features
2. **Switch to Staff** - Test project management workflow
3. **Test as Client** - Experience the client perspective
4. **Test collaboration** - Open multiple browser windows with different users

---

## Security Notes

⚠️ **For Production:**
- Change all passwords to strong, unique values
- Implement password reset functionality
- Add two-factor authentication
- Use environment variables for sensitive data
- Enable rate limiting on login endpoint
