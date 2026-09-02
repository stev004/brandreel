# brandreel

brandreel is a standalone, brand-agnostic 60fps 9:16 short-form video pipeline.

Milestone 1 includes the Remotion engine scaffold, the Moment template, the Stack composition, schema and layout lints, and a Regulate demo.

From the repository root, render the demo with:

```sh
node bin/compose.mjs workspace/demo
```

Add a brand by copying the `brands/regulate/brand.json` shape and pointing a script at the new brand directory. See [SPEC.md](SPEC.md) for the design and stage contracts.
