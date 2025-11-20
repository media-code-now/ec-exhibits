import 'dotenv/config';

const API_URL = 'http://localhost:4000';

async function testAuth() {
  console.log('🧪 Testing Authentication Endpoints\n');

  // Test 1: Register a new user
  console.log('Test 1: Register new user');
  try {
    const registerResponse = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@exhibitcontrol.com',
        password: 'password123',
        displayName: 'Admin User',
        role: 'owner'
      })
    });

    const registerData = await registerResponse.json();
    
    if (registerResponse.ok) {
      console.log('✅ Registration successful!');
      console.log('   User:', registerData.user.displayName, '(' + registerData.user.email + ')');
      console.log('   Token:', registerData.token.substring(0, 20) + '...');
    } else {
      console.log('❌ Registration failed:', registerData.error);
    }
  } catch (error) {
    console.log('❌ Registration error:', error.message);
  }

  console.log('');

  // Test 2: Login with the new user
  console.log('Test 2: Login with credentials');
  try {
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@exhibitcontrol.com',
        password: 'password123'
      })
    });

    const loginData = await loginResponse.json();
    
    if (loginResponse.ok) {
      console.log('✅ Login successful!');
      console.log('   User:', loginData.user.displayName);
      console.log('   Role:', loginData.user.role);
      console.log('   Token:', loginData.token.substring(0, 20) + '...');
    } else {
      console.log('❌ Login failed:', loginData.error);
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
  }

  console.log('');

  // Test 3: Try login with wrong password
  console.log('Test 3: Login with wrong password');
  try {
    const wrongPasswordResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@exhibitcontrol.com',
        password: 'wrongpassword'
      })
    });

    const wrongPasswordData = await wrongPasswordResponse.json();
    
    if (!wrongPasswordResponse.ok) {
      console.log('✅ Correctly rejected wrong password');
      console.log('   Error:', wrongPasswordData.error);
    } else {
      console.log('❌ Should have rejected wrong password!');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n🎉 Authentication tests complete!');
}

testAuth();
