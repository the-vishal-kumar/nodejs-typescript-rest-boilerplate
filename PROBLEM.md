# nodejs-typescript-rest-boilerplate

## Problem Statement

- Create an application that allows authenticated users to go through a loan application. It doesn’t have to contain too many fields, but at least “amount required” and “loan term”.
- All the loans will be assumed to have a “weekly” repayment frequency.
- After the loan is approved by an admin, the user must be able to submit the weekly loan repayments with an amount greater than or equal to the scheduled repayment amount.
- It can be a simplified repay functionality, which won’t need to check if the dates are correct but will just set the weekly amount to be repaid.

## Actions to implement

1. **Customer create a loan:**

   - Customer submit a loan request defining amount and term
   - The loan and scheduled repayments will have state PENDING
   - Example

     Customer requests an amount of 10000 dollars with term 3 weeks on the date 7th June 2023

     The customer will generate 3 scheduled repayments:

     1. 14th Feb 2022 with amount 3333.33 dollar
     1. 21st Feb 2022 with amount 3333.33 dollar
     1. 28th Feb 2022 with amount 3333.34 dollar

1. **Admin approves the loan:**

   - Admin change the pending loans to state APPROVED

1. **Customer can view the loan belong to them:**

   - Add a policy check to make sure that the customers can view their own loan only

1. **Customer add a repayments:**

   - The user/customer can add a repayment with amount greater than or equal to the scheduled repayment amount
   - Change the status of the scheduled repayment to PAID
   - If all the scheduled repayments connected to a loan are PAID, the status of loan is automatically changed to PAID
