import { usePath, useRoster, useSystem, useRosterErrors, useUpdateRoster, useConfirm } from './Context.js'
import _ from 'lodash'
import { useEffect, useState } from 'react'
import Force from './Force/Force.js'
// import BugReport from './BugReport.js'
import SelectRoster from './SelectRoster.js'
// import SelectForce from './Force/SelectForce.js'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
// Removed direct SelectForce controls
import { pathToForce } from './validate.js'
import Popover from '@mui/material/Popover'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import AddForceForm from './Force/AddForceForm.js'
import Chip from '@mui/material/Chip'
import Fade from '@mui/material/Fade'
import Grow from '@mui/material/Grow'
import { AlertTriangle, Check, Pencil, ChevronDown, Trash2 } from 'lucide-react'
import IconButton from '@mui/material/IconButton'
import Radio from '@mui/material/Radio'
import FormControlLabel from '@mui/material/FormControlLabel'
import Divider from '@mui/material/Divider'
import { gatherForces } from './Force/SelectForce.js'

const Roster = ({ currentForce, setCurrentForce }) => {
  const [roster, setRoster] = useRoster()
  const updateRoster = useUpdateRoster()
  const errors = useRosterErrors()
  const gameData = useSystem()
  const [path, setPath] = usePath()
  window.roster = roster

  // Default to first force if none selected
  useEffect(() => {
    try {
      if (path === '' && roster?.forces?.force?.length) {
        setPath('forces.force.0')
      }
    } catch {}
  }, [path, roster, setPath])

  const [forceAnchor, setForceAnchor] = useState(null)
  const [issuesAnchor, setIssuesAnchor] = useState(null)
  const confirmDeleteForce = useConfirm(true, 'Delete this force?')
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  if (!roster || !gameData) {
    return (
      <Box className="container">
        <SelectRoster />
      </Box>
    )
  }

  window.errors = errors

  const usedPts = roster?.costs?.cost?.find((c) => c.name === 'pts')?.value ?? 0
  const limit = roster?.costLimits?.costLimit?.find((c) => c.name === 'pts')?.value
  const rosterLevelErrors = (errors[''] || []).map((e) => (e instanceof Error ? e.message : String(e)))
  const forcePaths = gatherForces(roster)
  const forceErrors = forcePaths.map((p) => ({
    path: p,
    name: `${_.get(roster, p).catalogueName} - ${_.get(roster, p).name}`,
    list: (errors[p] || []).map((e) => (e instanceof Error ? e.message : String(e))),
  }))
  const totalIssues = rosterLevelErrors.length + forceErrors.reduce((sum, f) => sum + (f.list ? f.list.length : 0), 0)
  const rosterErrorTooltip =
    totalIssues > 0
      ? [...rosterLevelErrors, ...forceErrors.flatMap((f) => f.list)].join('<br />')
      : 'No validation issues'
  const issuesLabel = `${totalIssues} validation ${totalIssues === 1 ? 'issue' : 'issues'}`

  return (
    <Box component="article">
      {/* Roster header (sticky) */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: (t) => t.zIndex.appBar - 1,
          bgcolor: 'background.default',
          pb: 1,
          mb: 1,
          // Header info padding: present on mobile and desktop
          px: { xs: 2, md: 3 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, px: 0, pt: 1 }}>
          <Box sx={{ flexGrow: 1, minWidth: 280 }}>
            {/* Editable roster name */}
            {editingName ? (
              <TextField
                variant="standard"
                value={nameDraft}
                autoFocus
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => {
                  updateRoster('name', nameDraft)
                  setEditingName(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateRoster('name', nameDraft)
                    setEditingName(false)
                  } else if (e.key === 'Escape') {
                    setEditingName(false)
                  }
                }}
                sx={{
                  flexGrow: 1,
                  minWidth: 240,
                  maxWidth: 720,
                  width: '100%',
                  '& .MuiInputBase-input': (t) => ({
                    fontSize: t.typography.h4.fontSize,
                    fontWeight: 700,
                    lineHeight: t.typography.h4.lineHeight,
                  }),
                }}
              />
            ) : (
              <Box
                onClick={() => {
                  setNameDraft(roster?.name || '')
                  setEditingName(true)
                }}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'text',
                  borderBottom: '1px solid transparent',
                  '&:hover': { borderBottomColor: (t) => t.palette.primary.main },
                  minWidth: 240,
                  maxWidth: 720,
                  width: '100%',
                }}
              >
                <Typography variant="h4" fontWeight={700}>
                  {roster?.name || 'Untitled Roster'}
                </Typography>
                <Pencil size={16} />
              </Box>
            )}
            {/* Second row moved below */}
          </Box>
          {/* Right: reserved space not needed */}
          <Box />
        </Box>
        {/* Second row: force selector + points (left) and validations (right) */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mt: 0.5,
            // On mobile, wrap so points + validation move to a new line
            flexWrap: { xs: 'wrap', md: 'nowrap' },
          }}
        >
          <Box
            onClick={(e) => setForceAnchor(e.currentTarget)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              cursor: 'pointer',
              userSelect: 'none',
              borderBottom: '1px solid transparent',
              '&:hover': { borderBottomColor: (t) => t.palette.primary.main },
              // Take full width on mobile so following items wrap below
              flexBasis: { xs: '100%', md: 'auto' },
            }}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              {(() => {
                try {
                  const forcePath = pathToForce(path)
                  const f = _.get(roster, forcePath)
                  return f ? `${f.catalogueName} - ${f.name}` : 'Select force'
                } catch {
                  return 'Select force'
                }
              })()}
            </Typography>
            <ChevronDown size={16} />
          </Box>
          <Typography
            variant="caption"
            sx={{ px: 1, py: 0.5, border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1 }}
          >
            {limit && limit !== -1 ? `${usedPts} / ${limit} pts` : `${usedPts} pts`}
          </Typography>
          <Box sx={{ ml: { xs: 'auto', md: 'auto' } }}>
            {totalIssues > 0 ? (
              <Fade in>
                <Grow in key={`issues-${totalIssues}`} timeout={250}>
                  <Chip
                    size="small"
                    variant="outlined"
                    color="warning"
                    icon={<AlertTriangle size={14} />}
                    label={issuesLabel}
                    data-tooltip-id="tooltip"
                    data-tooltip-html={rosterErrorTooltip}
                    onClick={(e) => setIssuesAnchor(e.currentTarget)}
                    sx={{ cursor: 'pointer' }}
                  />
                </Grow>
              </Fade>
            ) : (
              <Fade in>
                <Chip
                  size="small"
                  variant="outlined"
                  color="success"
                  icon={<Check size={14} />}
                  label="No validation issues"
                  data-tooltip-id="tooltip"
                  data-tooltip-html={rosterErrorTooltip}
                  onClick={(e) => setIssuesAnchor(e.currentTarget)}
                  sx={{ cursor: 'pointer' }}
                />
              </Fade>
            )}
          </Box>
        </Box>
        <Popover
          open={!!forceAnchor}
          anchorEl={forceAnchor}
          onClose={() => setForceAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          <Box sx={{ p: 2, minWidth: 360 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Select force
            </Typography>
            {gatherForces(roster).map((fp, i) => {
              const f = _.get(roster, fp)
              const label = `${f.catalogueName} - ${f.name}`
              return (
                <Box key={fp} sx={{ display: 'flex', alignItems: 'center' }}>
                  <FormControlLabel
                    control={<Radio checked={pathToForce(path) === fp} onChange={() => setPath(fp)} />}
                    label={label}
                    sx={{ flexGrow: 1, m: 0, py: 0.5 }}
                  />
                  <IconButton
                    size="small"
                    aria-label={`Delete ${label}`}
                    disabled={(roster?.forces?.force?.length || 0) <= 1}
                    onClick={async () => {
                      await confirmDeleteForce(() => {
                        _.pull(roster.forces.force, f)
                        setRoster(roster)
                        const remaining = gatherForces(roster)
                        setPath(remaining[0] || '')
                      })
                    }}
                    sx={{ ml: 1 }}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </Box>
              )
            })}
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Add Force
            </Typography>
            <AddForceForm onAdded={() => setForceAnchor(null)} />
          </Box>
        </Popover>
        <Popover
          open={!!issuesAnchor}
          anchorEl={issuesAnchor}
          onClose={() => setIssuesAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          PaperProps={{ sx: { maxWidth: 480 } }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Validation issues
            </Typography>
            {totalIssues === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No validation issues
              </Typography>
            ) : forcePaths.length <= 1 ? (
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {[...rosterLevelErrors, ...(forceErrors[0]?.list || [])].map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </Box>
            ) : (
              <>
                {!!rosterLevelErrors.length && (
                  <>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 1 }}>
                      Roster
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                      {rosterLevelErrors.map((msg, idx) => (
                        <li key={`r-${idx}`}>{msg}</li>
                      ))}
                    </Box>
                  </>
                )}
                {!!forceErrors.some((f) => (f.list || []).length) && (
                  <>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 1 }}>
                      Forces
                    </Typography>
                    {forceErrors
                      .filter((f) => (f.list || []).length)
                      .map((f) => (
                        <Box key={f.path} sx={{ mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {f.name}
                          </Typography>
                          <Box component="ul" sx={{ m: 0, pl: 2 }}>
                            {f.list.map((msg, idx) => (
                              <li key={`${f.path}-${idx}`}>{msg}</li>
                            ))}
                          </Box>
                        </Box>
                      ))}
                  </>
                )}
              </>
            )}
          </Box>
        </Popover>
        {/* Replaced red list with subtle chip and tooltip above */}
      </Box>

      {/* Main content: show Force if present; otherwise allow adding first force */}
      {roster?.forces?.force?.length ? (
        <Force />
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', px: 2, pt: 4 }}>
          <Card sx={{ width: 420, maxWidth: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Add Force
              </Typography>
              <AddForceForm />
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  )
}

export default Roster
