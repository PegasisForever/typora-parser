# Contributing to Typora Parser

## Developing

To develop locally:

1. Fork this repository to your own GitHub account and then [clone](https://help.github.com/articles/cloning-a-repository/) it to your local device.

2. Create a new branch:

   ```sh
   git checkout -b MY_BRANCH_NAME
   ```

3. This project uses [pnpm](https://pnpm.io/) as package manager, so you need pnpm:

   ```sh
   npm install -g pnpm
   ```

4. Install the dependencies with:

   ```sh
   pnpm i
   ```

5. Start typescript compiler:

   ```sh
   pnpm watch
   ```

6. Keep the process from step 5 running, run the following to start `src/devmain.ts`.

   ```
   pnpm dev
   ```

   

