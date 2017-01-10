# Re-entrance

There are 2 contracts that allow pull payments:

* `PullPaymentGood`, updates the storage before the send
* `PullPaymentBad`, updates the storage after the send

`Attacker` makes use of the vulnerability in `PullPaymentBad`.