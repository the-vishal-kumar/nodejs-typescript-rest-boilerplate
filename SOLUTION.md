# nodejs-typescript-rest-boilerplate

## Solution

1. Description
   - There are four entities - User, Token, Loan, Repayment
   - Admin can signup, signin, apprive a loan request, singoff, or reset password
   - User can signup, signin, raise a loan request, view all their loans, view a particular loan, make a repayment, singoff, or reset password

1. Copy `.env.sample` to root directory as `.env`
    
    Fill in some value of `JWT_SECRET_KEY`
1. Copy `docker-compose.sample.yml` to root directory as `docker-compose.yml`
1. Go to terminal and run

    ```bash
    npm run docker-compose-build
    ```

1. Import Postman collection and environment variable from `/Postman` directory to Postman applcation

1. APIs List:
    1. Admin
        1. Signup
            ```bash
            curl --location 'localhost:3000/auth/signup/admin' \
            --header 'Content-Type: application/json' \
            --data-raw '{
                "email": "admin@example.com",
                "password": "strong-password",
                "firstName": "Admin"
            }'
            ```
        
        1. Signin
            ```bash
            curl --location 'localhost:3000/auth/signin/admin' \
            --header 'Content-Type: application/json' \
            --data-raw '{
                "email": "admin@example.com",
                "password": "strong-password"
            }'
            ```

        1. Approve loan request
            ```bash
            curl --location --request PUT 'localhost:3000/loan/0c127bd7-5241-4f83-9cc3-92224cf788f4/approve' \
            --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NDhjZmQ4Y2M5NmVlY2YzY2I1NzBhMTciLCJpYXQiOjE2ODY5NjE4ODYsImV4cCI6MTY4Njk2MzA4Nn0.TiqqOZ6j5gJrrUuTkMf6lOS0VJHR84rUnCRqapg6MEY'
            ```
    1. User
        1. Signup
            ```bash
            curl --location 'localhost:3000/auth/signup' \
            --header 'Content-Type: application/json' \
            --data-raw '{
                "email": "user@example.com",
                "password": "strong-password",
                "firstName": "User"
            }'
            ```
        1. Signin
            ```bash
            curl --location 'localhost:3000/auth/signin' \
            --header 'Content-Type: application/json' \
            --data-raw '{
                "email": "user@example.com",
                "password": "strong-password"
            }'
            ```
        1. View all my loans
            ```bash
            curl --location 'localhost:3000/loan/' \
            --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NDhjZmVkN2M5NmVlY2YzY2I1NzBhMWEiLCJpYXQiOjE2ODY5NjE5MDksImV4cCI6MTY4NzA0ODMwOX0.uqnFQIf5QiJ3RcIES4iTr7EMyFx-yfty8oD2CsfvCI8'
            ```
        1. Raise loan request
            ```bash
            curl --location 'localhost:3000/loan/' \
            --header 'Content-Type: application/json' \
            --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NDhjZmVkN2M5NmVlY2YzY2I1NzBhMWEiLCJpYXQiOjE2ODY5NjE5MDksImV4cCI6MTY4NzA0ODMwOX0.uqnFQIf5QiJ3RcIES4iTr7EMyFx-yfty8oD2CsfvCI8' \
            --data '{
                "amount": 22,
                "term": 7
            }'
            ```
        1. View a particular loan
            ```bash
            curl --location 'localhost:3000/loan/0c127bd7-5241-4f83-9cc3-92224cf788f4' \
            --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NDhjZmVkN2M5NmVlY2YzY2I1NzBhMWEiLCJpYXQiOjE2ODY5NjE5MDksImV4cCI6MTY4NzA0ODMwOX0.uqnFQIf5QiJ3RcIES4iTr7EMyFx-yfty8oD2CsfvCI8'
            ```
        1. Pay installment
            ```bash
            curl --location --request PUT 'localhost:3000/loan/0c127bd7-5241-4f83-9cc3-92224cf788f4/repayment' \
            --header 'Content-Type: application/json' \
            --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NDhjZmVkN2M5NmVlY2YzY2I1NzBhMWEiLCJpYXQiOjE2ODY5NjE5MDksImV4cCI6MTY4NzA0ODMwOX0.uqnFQIf5QiJ3RcIES4iTr7EMyFx-yfty8oD2CsfvCI8' \
            --data '{
                "amount": 7
            }'
            ```
