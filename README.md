# stubIDP

A mock OpenID Connect server for developers.

Stop waiting for identity providers. Start building.

---

## Why stubIDP?

Building apps with OAuth 2.0 / OpenID Connect authentication can be a frustrating process. stubIDP is a lightweight, fully-compliant OpenID Connect provider that runs locally or in your CI pipeline so you can stay focused on building your application.

## Quick Start

```bash
npx @cerberauth/stubidp --clientId web-app --clientSecret web-app-secret --redirectUri http://localhost:8080/callback
```

Your OIDC provider is now live at `http://localhost:3000/oauth2`

## Integration Examples

TODO

## Configuration

### Environment Variables

| Variable           | Default                 | Description                             |
| ------------------ | ----------------------- | --------------------------------------- |
| `DATABASE_DIALECT` | `postgresql`            | Database type: `postgresql` or `sqlite` |
| `DATABASE_URL`     | -                       | Connection string or file path          |
| `PORT`             | `3000`                  | HTTP server port                        |
| `OIDC_ISSUER`      | `http://localhost:3000` | Issuer URL in tokens                    |
| `LOG_LEVEL`        | `info`                  | Logging verbosity                       |

## Docker

TODO

## Important Notes

- **For development and testing only** - stubIDP is not hardened for production identity management
- **No user management** - stubIDP handles OAuth/OIDC flows; your app handles user authentication

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## License

This repository is licensed under the [MIT License](https://github.com/cerberauth/stubidp/blob/main/LICENSE) @ [CerberAuth](https://www.cerberauth.com/). You are free to use, modify, and distribute the contents of this repository for educational and testing purposes.
