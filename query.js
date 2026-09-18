fetch("https://firestore.googleapis.com/v1/projects/polynomial-center-h8gvj/databases/ai-studio-lkbbdanyelyelmen-e655f0f8-d3c9-44b7-a53c-93a9eba0decb/documents/users")
  .then(res => res.text())
  .then(text => console.log(text));
