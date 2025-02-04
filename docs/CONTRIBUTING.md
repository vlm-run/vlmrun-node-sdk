# Contributing to VLM Run Node.js SDK

We love your input! We want to make contributing to VLM Run Node.js SDK as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## We Develop with Github

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## Development Process

We use Github Flow, so all code changes happen through pull requests. Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Local Development Setup

1. Clone the repository:

```bash
git clone https://github.com/vlm-run/vlmrun-node-sdk.git
cd vlmrun-node-sdk
```

2. Install dependencies:

```bash
npm install
```

3. Run tests:

Add .env.test file with the following variables:

```bash
TEST_API_KEY=<your-api-key>
TEST_BASE_URL=https://dev.vlm.run/v1
```

```bash
npm test
npm run test:integration
```

## Code Style

- We use TypeScript for type safety
- Follow the existing code style
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and modular

## Running Tests

- Run all tests: `npm test`
- Run specific test: `npm test -- -t "test name"`
- Run with coverage: `npm run test:coverage`

## Commit Messages

We follow conventional commits specification. Your commit messages should be structured as follows:

```
feat: add new feature
fix: correct bug
docs: update documentation
test: add tests
chore: update dependencies
```

## Any contributions you make will be under the Apache-2.0 Software License

In short, when you submit code changes, your submissions are understood to be under the same [Apache-2.0 License](http://choosealicense.com/licenses/apache-2.0/) that covers the project. Feel free to contact the maintainers if that's a concern.

## Report bugs using Github's [issue tracker](https://github.com/vlm-run/vlmrun-node-sdk/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/vlm-run/vlmrun-node-sdk/issues/new); it's that easy!

## Write bug reports with detail, background, and sample code

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## License

By contributing, you agree that your contributions will be licensed under its Apache-2.0 License.

## References

This document was adapted from the open-source contribution guidelines for [Facebook's Draft](https://github.com/facebook/draft-js/blob/master/CONTRIBUTING.md).
