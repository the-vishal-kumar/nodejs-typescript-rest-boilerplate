describe('Auth endpoints', () => {
  describe('signup as user', () => {
    const email = 'user-auth-signup@example.com',
      password = 'password123',
      firstName = 'UserFirstName';

    it('should signup a new user', async () => {
      const response = await fetch('http://localhost:5000/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName }),
      });
      expect(response.status).toBe(204);
    });

    it('should throw error response when an old user tries to signup', async () => {
      const response = await fetch('http://localhost:5000/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName }),
      });
      expect(response.status).toBe(409);
    });
  });

  describe('signin as user', () => {
    const email = 'user-auth-signin@example.com',
      password = 'password123',
      firstName = 'UserFirstName';

    it('should signin and return an access token', async () => {
      await fetch('http://localhost:5000/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName }),
      });
      const response = await fetch('http://localhost:5000/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      expect(response.status).toBe(200);
      const responseJson = await response.json();
      expect(typeof responseJson.data.accessToken).toBe('string');
    });
  });

  describe('signup as admin', () => {
    const email = 'admin-auth-signup@example.com',
      password = 'password123',
      firstName = 'AdminFirstName';

    it('should signup a new admin', async () => {
      const response = await fetch('http://localhost:5000/auth/signup/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName }),
      });
      expect(response.status).toBe(204);
    });

    it('should throw error response when an old admin tries to signup', async () => {
      const response = await fetch('http://localhost:5000/auth/signup/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName }),
      });
      expect(response.status).toBe(409);
    });
  });

  describe('signin as admin', () => {
    const email = 'admin-auth-signin@example.com',
      password = 'password123',
      firstName = 'AdminFirstName';

    it('should signin and return an access token', async () => {
      await fetch('http://localhost:5000/auth/signup/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName }),
      });
      const response = await fetch('http://localhost:5000/auth/signin/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      expect(response.status).toBe(200);
      const responseJson = await response.json();
      expect(typeof responseJson.data.accessToken).toBe('string');
    });
  });

  describe('reset password', () => {
    describe('as user', () => {
      const email = 'user-auth-reset-password@example.com',
        password = 'password123',
        firstName = 'UserFirstName',
        newPassword = 'newPassword123';

      it('should signin and return an access token', async () => {
        await fetch('http://localhost:5000/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, firstName }),
        });
        const signinResponse = await fetch('http://localhost:5000/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const signinResponseJson = await signinResponse.json();
        const token = signinResponseJson.data.accessToken;
        const response = await fetch('http://localhost:5000/auth/password/reset', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ password: newPassword }),
        });
        expect(response.status).toBe(204);
      });
    });

    describe('as admin', () => {
      const email = 'admin-auth-reset-password@example.com',
        password = 'password123',
        firstName = 'AdminFirstName',
        newPassword = 'newPassword123';

      it('should signin and return an access token', async () => {
        await fetch('http://localhost:5000/auth/signup/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, firstName }),
        });
        const signinResponse = await fetch('http://localhost:5000/auth/signin/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const signinResponseJson = await signinResponse.json();
        const token = signinResponseJson.data.accessToken;
        const response = await fetch('http://localhost:5000/auth/password/reset', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ password: newPassword }),
        });
        expect(response.status).toBe(204);
      });
    });
  });

  describe('signoff', () => {
    describe('as user', () => {
      const email = 'user-auth-signoff@example.com',
        password = 'password123',
        firstName = 'UserFirstName',
        newPassword = 'newPassword123';

      it('should invalidate the access token', async () => {
        await fetch('http://localhost:5000/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, firstName }),
        });
        const signinResponse = await fetch('http://localhost:5000/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const signinResponseJson = await signinResponse.json();
        const token = signinResponseJson.data.accessToken;
        const signoffResponse = await fetch('http://localhost:5000/auth/signoff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
        expect(signoffResponse.status).toBe(204);
        // verify that token is invalidated
        const resetPasswordResponse = await fetch('http://localhost:5000/auth/password/reset', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ password: newPassword }),
        });
        const resetPasswordResponseJson = await resetPasswordResponse.json();
        expect(resetPasswordResponse.status).toBe(401);
        expect(resetPasswordResponseJson.error).toBe('Invalid access token');
      });
    });

    describe('as admin', () => {
      const email = 'admin-auth-signoff@example.com',
        password = 'password123',
        firstName = 'AdminFirstName',
        newPassword = 'newPassword123';

      it('should invalidate the access token', async () => {
        await fetch('http://localhost:5000/auth/signup/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, firstName }),
        });
        const signinResponse = await fetch('http://localhost:5000/auth/signin/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const signinResponseJson = await signinResponse.json();
        const token = signinResponseJson.data.accessToken;
        const signoffResponse = await fetch('http://localhost:5000/auth/signoff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
        expect(signoffResponse.status).toBe(204);
        // verify that token is invalidated
        const resetPasswordResponse = await fetch('http://localhost:5000/auth/password/reset', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ password: newPassword }),
        });
        const resetPasswordResponseJson = await resetPasswordResponse.json();
        expect(resetPasswordResponse.status).toBe(401);
        expect(resetPasswordResponseJson.error).toBe('Invalid access token');
      });
    });
  });
});
