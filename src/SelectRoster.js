import { useEffect, useMemo, useState } from 'react'
import path from 'path-browserify'
import { BounceLoader } from 'react-spinners'
import { FileDrop } from 'react-file-drop'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CardActionArea from '@mui/material/CardActionArea'
import IconButton from '@mui/material/IconButton'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MSelect from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Autocomplete from '@mui/material/Autocomplete'
import { Trash2, Plus, Upload, Copy } from 'lucide-react'
import { alpha } from '@mui/material/styles'

import {
  listRosters,
  loadRoster,
  importRoster,
  deleteRoster,
  deleteAllRosters,
  duplicateRoster,
} from './repo/rosters.js'
import { useFs, useNative, useRoster, useSystem, useConfirm } from './Context.js'
import { createRoster } from './utils.js'

const SelectRoster = () => {
  const [, setRoster] = useRoster()
  const [rosters, setRosters] = useState(null)
  const gameData = useSystem()
  const confirmDelete = useConfirm(true, 'Delete this roster?')
  const { fs, rosterPath } = useFs()
  const { shellOpen } = useNative()

  useEffect(() => {
    const load = async () => {
      // listRosters expects the root rosterPath; it will resolve the system folder internally
      const r = await listRosters(gameData.gameSystem, fs, rosterPath)
      setRosters(r)
    }

    if (!rosters && gameData) {
      load()
    }
  }, [rosters, gameData, fs, rosterPath])

  // Sorting and filtering state
  const [sortBy, setSortBy] = useState('updatedDesc')
  const [factionFilter, setFactionFilter] = useState([])

  const factions = useMemo(() => {
    if (!rosters) return []
    const set = new Set()
    Object.values(rosters).forEach((s) =>
      (s?.forces || []).forEach((f) => f?.catalogueName && set.add(f.catalogueName)),
    )
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [rosters])

  const formatDateTime = (iso) => {
    try {
      if (!iso) return 'Unknown'
      const then = new Date(iso).getTime()
      const now = Date.now()
      const diffMs = Math.max(0, now - then)
      const mins = Math.round(diffMs / 60000)
      if (mins < 1) return 'just now'
      if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
      const hours = Math.round(mins / 60)
      if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
      const days = Math.round(hours / 24)
      if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
      const weeks = Math.round(days / 7)
      if (days < 30) return `${weeks} week${weeks === 1 ? '' : 's'} ago`
      const months = Math.round(days / 30)
      if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
      return 'more than a year ago'
    } catch {
      return 'Unknown'
    }
  }

  const rosterEntries = useMemo(() => (rosters ? Object.entries(rosters) : []), [rosters])
  const filteredSortedEntries = useMemo(() => {
    let items = rosterEntries
    // Filter by faction (any force matching)
    if (factionFilter.length) {
      const wanted = new Set(factionFilter)
      items = items.filter(([, s]) => (s?.forces || []).some((f) => wanted.has(f?.catalogueName)))
    }
    // Sort
    const cmp = {
      updatedDesc: (a, b) => new Date(b[1]?.updatedAt || 0) - new Date(a[1]?.updatedAt || 0),
      nameAsc: (a, b) => (a[1]?.name || '').localeCompare(b[1]?.name || ''),
      pointsDesc: (a, b) => (b[1]?.pts ?? -1) - (a[1]?.pts ?? -1),
      forcesDesc: (a, b) => (b[1]?.forces?.length ?? 0) - (a[1]?.forces?.length ?? 0),
    }[sortBy]
    return [...items].sort(cmp)
  }, [rosterEntries, sortBy, factionFilter])

  return (
    <Box>
      {/* New roster section */}
      <Typography variant="h5" gutterBottom>
        New Roster
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }} alignItems="stretch">
        {/* Create new roster card */}
        <Grid
          item
          xs={12}
          sm={6}
          md={3}
          lg={3}
          sx={{
            flexBasis: { xs: '100%', sm: '50%', md: '25%' },
            maxWidth: { xs: '100%', sm: '50%', md: '25%' },
          }}
        >
          <Card
            elevation={4}
            sx={{
              height: '100%',
              border: (t) => `1px solid ${t.palette.primary.main}`,
              bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.14 : 0.08),
            }}
          >
            <CardActionArea
              sx={{ height: '100%', minHeight: 200, display: 'flex' }}
              onClick={async () => {
                const roster = await createRoster('Roster', gameData.gameSystem)
                setRoster(roster)
              }}
            >
              <CardContent
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', py: 6 }}
              >
                <Box
                  aria-hidden="true"
                  sx={{
                    color: 'primary.contrastText',
                    bgcolor: 'primary.main',
                    borderRadius: '50%',
                    width: 38,
                    height: 38,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Plus />
                </Box>
                <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 700 }}>
                  Create new roster
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>

        {/* Import roster card (hidden on mobile) */}
        <Grid
          item
          xs={12}
          sm={6}
          md={3}
          lg={3}
          sx={{
            display: { xs: 'none', sm: 'block' },
            flexBasis: { xs: '100%', sm: '50%', md: '25%' },
            maxWidth: { xs: '100%', sm: '50%', md: '25%' },
          }}
        >
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardActionArea
              sx={{ height: '100%', minHeight: 200, display: 'flex' }}
              onClick={() => document.getElementById('import-roster').click()}
            >
              <FileDrop
                onFrameDrop={async (event) => {
                  if (event.dataTransfer?.items[0]?.kind === 'file') {
                    const file = event.dataTransfer.items[0].getAsFile()
                    const systemRosterPath = path.join(rosterPath, gameData.gameSystem.id)
                    await importRoster(file, fs, systemRosterPath)
                    setRosters(null)
                  }
                }}
                style={{ display: 'block', width: '100%', height: '100%' }}
              >
                <CardContent
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    py: 6,
                  }}
                >
                  <Box aria-hidden="true" sx={{ color: 'primary.main' }}>
                    <Upload />
                  </Box>
                  <Typography variant="subtitle1" sx={{ mt: 1 }}>
                    Import roster
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Drop a .ros/.rosz file here, or{' '}
                    <Button
                      variant="text"
                      size="small"
                      component="span"
                      onClick={(e) => {
                        e.stopPropagation()
                        document.getElementById('import-roster').click()
                      }}
                    >
                      choose a file
                    </Button>
                  </Typography>
                </CardContent>
              </FileDrop>
            </CardActionArea>
            <input
              type="file"
              accept=".rosz,.ros"
              id="import-roster"
              onChange={async (e) => {
                const systemRosterPath = path.join(rosterPath, gameData.gameSystem.id)
                await importRoster(e.target.files[0], fs, systemRosterPath)
                setRosters(null)
              }}
            />
          </Card>
        </Grid>
      </Grid>

      {/* Saved rosters */}
      <Typography variant="h5" gutterBottom>
        Saved Rosters
      </Typography>
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1, flexWrap: 'wrap' }}
      >
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel id="sort-by-label">Sort by</InputLabel>
            <MSelect
              labelId="sort-by-label"
              id="sort-by"
              label="Sort by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <MenuItem value="updatedDesc">Last updated</MenuItem>
              <MenuItem value="nameAsc">Name (A–Z)</MenuItem>
              <MenuItem value="pointsDesc">Points (high → low)</MenuItem>
              <MenuItem value="forcesDesc">Forces (many → few)</MenuItem>
            </MSelect>
          </FormControl>
          <Autocomplete
            size="small"
            multiple
            options={factions}
            value={factionFilter}
            onChange={(e, v) => setFactionFilter(v)}
            renderInput={(params) => <TextField {...params} label="Filter by faction" placeholder="Factions" />}
            disableCloseOnSelect
            sx={{ minWidth: 260, maxWidth: 340 }}
          />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={async () => {
              const systemRosterPath = path.join(rosterPath, gameData.gameSystem.id)
              await deleteAllRosters(fs, systemRosterPath)
              setRosters(null)
            }}
          >
            Delete all (this system)
          </Button>
          {!!shellOpen && (
            <Button
              variant="outlined"
              onClick={async () => {
                const systemRosterPath = path.join(rosterPath, gameData.gameSystem.id)
                await shellOpen(systemRosterPath)
              }}
            >
              Open directory
            </Button>
          )}
        </Stack>
      </Box>

      {!rosters ? (
        <BounceLoader color="#36d7b7" className="loading" />
      ) : rosterEntries.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No saved rosters yet.
        </Typography>
      ) : (
        <Grid container spacing={2} alignItems="stretch">
          {filteredSortedEntries.map(([filename, summary]) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={3}
              lg={3}
              key={filename}
              sx={{
                flexBasis: { xs: '100%', sm: '50%', md: '25%' },
                maxWidth: { xs: '100%', sm: '50%', md: '25%' },
              }}
            >
              <Card variant="outlined" sx={{ position: 'relative', height: '100%' }}>
                {/* Actions in top-right: duplicate and delete */}
                <IconButton
                  size="small"
                  aria-label="Duplicate roster"
                  sx={{ position: 'absolute', top: 4, right: 32, zIndex: 1 }}
                  onClick={async (e) => {
                    e.stopPropagation()
                    const systemRosterPath = path.join(rosterPath, gameData.gameSystem.id)
                    const newFile = await duplicateRoster(filename, fs, systemRosterPath)
                    // Open the copy immediately
                    const newRoster = await loadRoster(newFile, fs, systemRosterPath)
                    setRoster(newRoster, false)
                  }}
                >
                  <Copy size={16} />
                </IconButton>
                {/* Delete icon in top-right */}
                <IconButton
                  size="small"
                  aria-label="Delete roster"
                  sx={{ position: 'absolute', top: 4, right: 4, zIndex: 1 }}
                  onClick={async (e) => {
                    e.stopPropagation()
                    await confirmDelete(async () => {
                      const systemRosterPath = path.join(rosterPath, gameData.gameSystem.id)
                      await deleteRoster(filename, fs, systemRosterPath)
                      setRosters(null)
                    })
                  }}
                >
                  <Trash2 size={16} />
                </IconButton>

                {/* Whole card clickable to load */}
                <CardActionArea
                  sx={{ height: '100%', minHeight: 200 }}
                  onClick={async () => {
                    if (summary?.error) return
                    const systemRosterPath = path.join(rosterPath, gameData.gameSystem.id)
                    setRoster(await loadRoster(filename, fs, systemRosterPath), false)
                  }}
                >
                  <CardContent sx={{ width: '100%' }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom noWrap>
                      {summary?.name || 'Unknown roster'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }} noWrap>
                      Last updated {formatDateTime(summary?.updatedAt)}
                    </Typography>
                    {summary?.error ? (
                      <Typography color="error" variant="body2">
                        Unable to parse roster
                      </Typography>
                    ) : (
                      <Box sx={{ minHeight: 44, mb: 1 }}>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {(summary?.forces || []).slice(0, 5).map((f, i) => (
                            <Chip key={i} size="small" label={f?.catalogueName || f?.name || 'Force'} />
                          ))}
                          {summary?.forces?.length > 5 && (
                            <Chip size="small" label={`+${summary.forces.length - 5} more`} />
                          )}
                        </Stack>
                      </Box>
                    )}
                    {!summary?.error && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {summary?.pts != null ? `${summary.pts} pts` : '- pts'}
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}

export default SelectRoster
