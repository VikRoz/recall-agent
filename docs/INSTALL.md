# Run Recall Agent with your own accounts

## Before starting

- A Mac with Node 22.23.1 or newer and Codex CLI. This is the verified client path; no Docker is required.
- Your ChatGPT account with working Codex access and an available model. Follow the [official Codex CLI guide](https://developers.openai.com/codex/cli), then run `codex login` and choose ChatGPT sign-in. An API key is not required for this model path.
- Your Walrus Memory Mainnet account/delegate access and official sponsored storage.
- Your Tatum Free account, its24-character Account ID, a Mainnet key from that account and at least16 included credits at2 credits/request. Do not enable an upgrade to run this demo.

The project contains no author's credentials. Your provider keys stay in a private local folder outside the extracted source. The demo window is240 seconds, so finish account access first and keep the first task small.

## Start from the correct folder

Extract `Recall-Agent.zip`. In Finder, open the extracted `Recall-Agent` folder and open a Terminal there. Alternatively type `cd `, drag that folder into Terminal and press Enter. Then paste:

```bash
bash start.command --live "$HOME/.local/share/recall-agent"
```

If you see `start.command: No such file or directory`, Terminal is in the wrong folder. Running it from your home folder does not locate the extracted file automatically.

## Follow the prompts

1. Complete official Walrus browser sign-in. The project reuses its official Memory client; you do not paste a delegate private key or wallet seed into chat.
2. If that setup asks about automatic memory, choose manual saving (`2`). Recall Agent itself saves validated records under your next explicit activation scope.
3. Enter the **Tatum Account ID**, then the included-credit number. These are separate fields: `99,976` is a credit count, not an Account ID.
4. Choose `FACTS` or `ALL`. After checking your Free account and sponsorship, type `ACTIVATE` once to confirm them and the displayed limits. There is no separate confirmation phrase.
5. Paste that account's Mainnet API key into the hidden Terminal field. Hidden input shows no characters. Press Enter once.

Wait for the Codex composer. Chat prompts belong there, not at a shell prompt ending in `%` or `$`. No initial user task is sent by the launcher.

## Choose a model and ask a question

Use `/model` in Codex to select an available model. The author verified gpt-5.6-luna; your account list can differ. A model-not-supported error is not permission to switch to a paid API fallback.

Give a Sui Mainnet wallet and selected transaction IDs or supported explorer links. Ask for status, gas payer, exact base-unit changes or CSV. The model chooses tools; there is no forced failure/save/correction sequence.

`FACTS` stores checked transaction observations automatically. `ALL` also admits supported verified mismatches and linked successful corrections. Arbitrary chat statements are not automatically verified or stored. Address-rule previews require explicit confirmation.

## Check a new conversation

Within the same active window, exit the client and run the **same command and private folder** again. This opens a new conversation with the same workspace; it does not reset the allowance. Ask for the historical observation, its blob ID, fresh-data comparison and original CSV/path/hash.

After expiry, quota, access failure or uncertainty, stop. The prototype has no silent renewal. Keep the private folder private and manage/revoke delegate access through your own Walrus account when finished.

## Check without accounts or providers

```bash
bash start.command --check
```

The judge ZIP includes dependencies. A source checkout needs the two pinned `npm ci` commands in the README. Tests intercept providers and fake native clients; they are not a new live rehearsal. Detailed source, receipts and limitations are linked from the README.
