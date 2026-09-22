One-sentence: the TrackWard lockup — use it in the top bar, auth screens and the footer; never re-draw or re-space the mark.

```jsx
<Logo size={22} />
<Logo size={18} wordmark={false} />
<Logo size={26} tone="ink" />   {/* only on light surfaces */}
```

The mark is two bars (done checkpoints) + an open lime ring (the checkpoint you are on). Footer uses `<Logo size={16} />` followed by the tagline "move work forward." in --text-faint.
