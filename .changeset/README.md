# Changesets

This project uses [changesets](https://github.com/changesets/changesets) to manage versions and changelogs.

## Creating a changeset

When you make changes, create a changeset:

```bash
npm run changeset
```

This will prompt you to:
1. Select the type of change (major/minor/patch)
2. Describe the change

The changeset is committed with your PR.

## Releasing

1. When changesets exist, a PR is automatically created to bump versions
2. Review and merge the version PR
3. Create a GitHub release with the new version tag (e.g., `v0.0.2`)
4. The release workflow automatically publishes to npm and Docker registries
