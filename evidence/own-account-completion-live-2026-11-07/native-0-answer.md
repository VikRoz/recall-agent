Проверено по текущим данным Sui Mainnet через Tatum, `asOf: 2026-11-07T19:30:19Z`. Все семь транзакций успешны.

`SUI base unit = MIST`.

1. `2it6GExEsJgfjvrh9wZ7EUK4Pboe4dm6gN3ZrBX6bgE3`
   - Status: `success`
   - Gas payer: `0x000037de3368098ebbb5bc6808283004f4746a34e16d32e171f9400cd58cdd69`
   - Net gas: `104194`
   - Exact balance change: payer SUI `-104194`
   - Monitored wallet: sender, но не gas payer и без balance change.
   - Uncertainty: PTB не разобран (`makeMoveVector` + 8 `moveCall`); другие token/object effects не интерпретированы.

2. `9id3PUdCt16v7hQZA5BKpSNw5uG9cxPCqinJw7Dc8Ksj`
   - Status: `success`
   - Gas payer: `0x6be20abe12a8e930fd8da5120fcb392753ef7b57b43401417aedaadeb1106ec4`
   - Net gas: `102970`
   - Exact balance change: payer SUI `-102970`
   - Monitored wallet: не sender, не payer, balance change отсутствует.
   - Uncertainty: PTB не разобран; точные не-SUI effects не определены.

3. `BjV2Q8mCarkmtENT1T3SPncKAFP3qNHQKVJ2DgptUnkW`
   - Status: `success`
   - Gas payer: `0x5dc5f85e4ca400f971f0166cba041bb33a37dadb1d2511b9a87b9150c8b2e1ac`
   - Net gas: `6122620`
   - Exact balance change: payer SUI `-6122620`
   - Monitored wallet: не участвует по проверенным флагам.
   - Uncertainty: PTB содержит `moveCall` и `transferObjects`, но не разобран; direct counterparty не устанавливается.

4. `399audbJp2xHpY7R2M7T2jFASw8AvPVGauZ4pBRLgJdj`
   - Status: `success`
   - Gas payer: `0xe8e0bfd3739232a9200d5ec4a52bf8fe871d0dfaaf47049663256e016d85763a`
   - Net gas: `7201288`
   - Exact balance change: payer SUI `-7201288`
   - Monitored wallet: не участвует по проверенным флагам.
   - Uncertainty: единственный `moveCall` представлен как unparsed PTB.

5. `3o43bsVXvFpRthgSgkJzugZiR9UGPYWJsFKACXfkMho7`
   - Status: `success`
   - Gas payer: `0xe8e0bfd3739232a9200d5ec4a52bf8fe871d0dfaaf47049663256e016d85763a`
   - Net gas: `7014784`
   - Exact balance change: payer SUI `-7014784`
   - Monitored wallet: не участвует по проверенным флагам.
   - Uncertainty: unparsed PTB; историческая запись совпадает с текущими данными.

6. `CvJ6jx8Knu6jeGdZZb2F3XyfBRazqKJJmKchywckBMAL`
   - Status: `success`
   - Gas payer: `0xe8e0bfd3739232a9200d5ec4a52bf8fe871d0dfaaf47049663256e016d85763a`
   - Net gas: `7014784`
   - Exact balance change: payer SUI `-7014784`
   - Monitored wallet: не участвует по проверенным флагам.
   - Uncertainty: unparsed PTB; token/object effects не интерпретированы.

7. `6zSQhBMT8ro6eAs4UvWKqfcxSd9Rgjz5nR9m85bBSsEw`
   - Status: `success`
   - Gas payer: `0xe8e0bfd3739232a9200d5ec4a52bf8fe871d0dfaaf47049663256e016d85763a`
   - Net gas: `-1507780` — возврат превышает расходы.
   - Exact balance change: payer SUI `+1507780`
   - Monitored wallet: не участвует по проверенным флагам.
   - Uncertainty: unparsed PTB; другие effects не интерпретированы. Историческая запись совпадает с текущей.

Исторические наблюдения Recall существуют для всех семи транзакций. Они были отдельными предыдущими наблюдениями, совпали со свежим чтением и не использовались как история кошелька или инструкция. Проверка охватывает только выбранные digest’ы, не полный wallet history. Прямые counterparties и ownership не выводились.

CSV-артефакт: [скачать CSV](/private/tmp/recall-own-completion-ready-is5Kld/packet/state/runs/127ebaac-6a7b-45d5-9e19-6e8857857a41/exports/8a4b5e98973650724d46863dc8d7b2b2e8f71986189f57e9a3dfe9ef8ee4a04a.csv)

SHA-256: `8a4b5e98973650724d46863dc8d7b2b2e8f71986189f57e9a3dfe9ef8ee4a04a`
