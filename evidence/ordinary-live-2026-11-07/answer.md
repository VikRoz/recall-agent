Your assumption is not supported by onchain evidence.

- Sender: `0x7777…df23` — your wallet
- Gas payer: `0x0000…dd69` — a different address
- Verifier result: `fail`

Exact gas accounting:

- Computation: `100,000` MIST
- Storage: `42,605,600` MIST
- Rebate: `42,601,339` MIST
- Net gas charge: `104,261` MIST
- Reported balance change: `-104,261` MIST (`-0.000104261 SUI`)

That `-104,261` MIST change belongs to the observed gas payer, not your wallet. The transaction’s PTB is marked unparsed, so the evidence does not provide a more detailed token-level interpretation beyond this movement.
