describe('artists', () => {
  const { Artists } = DuckStorage
  describe('add-artwork', () => {
    it('adds an artwork in the artist profile', async () => {
      const artist = getFixture('Artist')
      await Artists.create(artist)
    })
    it('emits an ArtworkCreated event when created', async t => {
      emitsEvent('EventName')
    })
  })
})
