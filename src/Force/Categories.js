import { findId } from '../utils' // Import utility function to retrieve IDs

// Functional component to display categories as a comma-separated string
const Categories = ({ categories }) => {
  // Convert category object keys to a sorted, comma-separated string
  const string = Object.keys(categories).sort().join(', ')
  if (!string) {
    return null // If no categories, return null to avoid rendering empty content
  }

  return (
    <article>
      <strong>Categories: </strong>
      <em>{string}</em> {/* Display sorted categories in italics */}
    </article>
  )
}

export default Categories

// Helper function to recursively gather categories from an entry and its selections
export const collectCategories = (entry, gameData, catalogue, categories = {}) => {
  // Add each category’s name to the categories object for the current entry
  entry.categories?.category.forEach((c) => (categories[findId(gameData, catalogue, c.entryId).name] = true))

  // Recursively process sub-selections to gather their categories
  entry.selections?.selection.forEach((e) => collectCategories(e, gameData, catalogue, categories))

  return categories // Return the gathered categories object
}
