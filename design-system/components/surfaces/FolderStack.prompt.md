One-sentence: the home-screen carousel — pair it with a CheckpointTrail and one lime action beneath the focused folder.

```jsx
<FolderStack items={tracks} active={i} onActiveChange={setI}
  render={(t, isActive) => <FolderCard kicker={t.kind} title={t.name} dim={!isActive} />} />
```

Neighbour folders are clickable; arrows ("2 de 8") sit in the section header, not on the stack.
