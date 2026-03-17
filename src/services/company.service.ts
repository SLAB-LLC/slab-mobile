import { supabase } from '../utils/supabase'
import { Company } from '../types'

/**
 * Company Service
 * Centralized service for company-related database operations
 */

/**
 * Fetch a company by ID
 * @param id - The company ID
 * @returns Company or null
 */
export async function getCompanyById(id: string): Promise<Company | null> {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        console.warn('Company not found:', id)
        return null
      }
      throw new Error(`Failed to fetch company: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error in getCompanyById:', error)
    throw error
  }
}

/**
 * Fetch all companies (for super admins only)
 * @returns Array of companies
 */
export async function getAllCompanies(): Promise<Company[]> {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching companies:', error)
      throw new Error(`Failed to fetch companies: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error in getAllCompanies:', error)
    throw error
  }
}
