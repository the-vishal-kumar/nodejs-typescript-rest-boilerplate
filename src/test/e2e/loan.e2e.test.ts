describe('Loan endpoints', () => {
  describe('request loan', () => {
    const email = 'user-loan-request@example.com',
      password = 'password123',
      firstName = 'UserFirstName';
    const amount = 22,
      term = 7;

    it('should not raise loan request for unauthenticated user', async () => {
      const response = await fetch('http://localhost:5000/loan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, term }),
      });
      const responseJson = await response.json();
      expect(responseJson.status).toBe(401);
      expect(responseJson.error).toBe('Missing access token');
    });

    it('should raise loan request', async () => {
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

      const response = await fetch('http://localhost:5000/loan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, term }),
      });
      const responseJson = await response.json();
      expect(responseJson.status).toBe(201);
      expect(typeof responseJson.data.id).toBe('string');
    });
  });

  describe('view all loans', () => {
    const email = 'user-loan-view-all-loans@example.com',
      password = 'password123',
      firstName = 'UserFirstName';
    const amount = 22,
      term = 7;

    test('should have the required properties', async () => {
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
      await fetch('http://localhost:5000/loan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, term }),
      });
      const response = await fetch('http://localhost:5000/loan', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const responseJson = await response.json();
      expect(responseJson.status).toBe(200);
      expect(Array.isArray(responseJson.data)).toBe(true);

      expect(responseJson).toHaveProperty('status');
      expect(responseJson).toHaveProperty('data');
      expect(responseJson.data[0]).toHaveProperty('id');
      expect(responseJson.data[0]).toHaveProperty('userId');
      expect(responseJson.data[0]).toHaveProperty('amount');
      expect(responseJson.data[0]).toHaveProperty('term');
      expect(responseJson.data[0]).toHaveProperty('status');
      expect(responseJson.data[0]).toHaveProperty('createdAt');
      expect(responseJson.data[0]).toHaveProperty('updatedAt');
      expect(responseJson.data[0]).toHaveProperty('repayments');

      const repayments = responseJson.data[0].repayments;
      expect(repayments.length).toBeGreaterThan(0);
      for (const repayment of repayments) {
        expect(repayment).toHaveProperty('id');
        expect(repayment).toHaveProperty('loanId');
        expect(repayment).toHaveProperty('dueAmount');
        expect(repayment).toHaveProperty('paidAmount');
        expect(repayment).toHaveProperty('isLast');
        expect(repayment).toHaveProperty('status');
        expect(repayment).toHaveProperty('dueDate');
        expect(repayment).toHaveProperty('createdAt');
        expect(repayment).toHaveProperty('updatedAt');
      }
    });
  });

  describe('view a loan', () => {
    const email = 'user-loan-view-particular-loan@example.com',
      password = 'password123',
      firstName = 'UserFirstName';
    const amount = 22,
      term = 7;

    test('should have the required properties', async () => {
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
      const raiseLoanResponse = await fetch('http://localhost:5000/loan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, term }),
      });
      const raiseLoanResponseJson = await raiseLoanResponse.json();
      const loanId = raiseLoanResponseJson.data.id;
      const response = await fetch(`http://localhost:5000/loan/${loanId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const responseJson = await response.json();
      expect(responseJson.status).toBe(200);

      expect(responseJson).toHaveProperty('status');
      expect(responseJson).toHaveProperty('data');
      expect(responseJson.data).toHaveProperty('id');
      expect(responseJson.data).toHaveProperty('userId');
      expect(responseJson.data).toHaveProperty('amount');
      expect(responseJson.data).toHaveProperty('term');
      expect(responseJson.data).toHaveProperty('status');
      expect(responseJson.data).toHaveProperty('createdAt');
      expect(responseJson.data).toHaveProperty('updatedAt');
      expect(responseJson.data).toHaveProperty('repayments');

      const repayments = responseJson.data.repayments;
      expect(repayments.length).toBeGreaterThan(0);
      for (const repayment of repayments) {
        expect(repayment).toHaveProperty('id');
        expect(repayment).toHaveProperty('loanId');
        expect(repayment).toHaveProperty('dueAmount');
        expect(repayment).toHaveProperty('paidAmount');
        expect(repayment).toHaveProperty('isLast');
        expect(repayment).toHaveProperty('status');
        expect(repayment).toHaveProperty('dueDate');
        expect(repayment).toHaveProperty('createdAt');
        expect(repayment).toHaveProperty('updatedAt');
      }
    });
  });

  describe('approve loan', () => {
    const adminEmail = 'admin-loan-approve-loan@example.com',
      adminPassword = 'password123',
      adminFirstName = 'UserFirstName';
    const userEmail = 'user-loan-approve-loan@example.com',
      userPassword = 'password123',
      userFirstName = 'UserFirstName';
    const amount = 22,
      term = 7;

    test('should have the required properties', async () => {
      await fetch('http://localhost:5000/auth/signup/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword, firstName: adminFirstName }),
      });
      const adminSigninResponse = await fetch('http://localhost:5000/auth/signin/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const adminSigninResponseJson = await adminSigninResponse.json();
      const adminToken = adminSigninResponseJson.data.accessToken;
      await fetch('http://localhost:5000/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, password: userPassword, firstName: userFirstName }),
      });
      const userSigninResponse = await fetch('http://localhost:5000/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, password: userPassword }),
      });
      const userSigninResponseJson = await userSigninResponse.json();
      const userToken = userSigninResponseJson.data.accessToken;
      const raiseLoanResponse = await fetch('http://localhost:5000/loan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ amount, term }),
      });
      const raiseLoanResponseJson = await raiseLoanResponse.json();
      const loanId = raiseLoanResponseJson.data.id;
      const response = await fetch(`http://localhost:5000/loan/${loanId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      });
      expect(response.status).toBe(204);
    });
  });
});
