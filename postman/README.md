# Postman

## Import

1. Import `paypal-sandbox.collection.json`, `carrier-mock.collection.json`,
   `dispute-helper-api.collection.json`, and `local.environment.json` into Postman.
2. Select the imported `local` environment.
3. Fill in values locally for `baseUrl`, PayPal credentials, and any IDs. Do not
   commit local environment exports or credentials.
4. In the PayPal collection, run **Get token** first. Its test script stores the
   returned token in the collection variable `accessToken`.

The collections contain no credentials or real identifiers.

## PayPal sandbox flow

Use the PayPal collection in this order:

1. **Get token**
2. **Create order**
3. **Capture order**
4. **Get order**, **Capture details**, and dispute/tracking requests as needed
5. For the demo approval flow, use **dispute-helper-api** to log in and approve
   the corresponding case in the browser first.
6. Only then use **Capture order** for the sandbox order.

Never refund the demo capture. The approval/refund API is for an explicitly
approved real sandbox transaction, not the seeded demo data.
