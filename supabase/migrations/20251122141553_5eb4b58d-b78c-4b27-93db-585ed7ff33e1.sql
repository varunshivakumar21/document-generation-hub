-- Fix security issues in profiles and generated_documents tables

-- 1. Drop existing policies on profiles table to recreate them with better security
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- 2. Recreate profiles policies with explicit authentication requirement
CREATE POLICY "Authenticated users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Authenticated users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. Block all anonymous access to profiles explicitly
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- 4. Drop and recreate policies on generated_documents with stronger security
DROP POLICY IF EXISTS "Users can create generated documents" ON public.generated_documents;
DROP POLICY IF EXISTS "Users can view their own generated documents" ON public.generated_documents;

CREATE POLICY "Authenticated users can create their own generated documents"
ON public.generated_documents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view their own generated documents"
ON public.generated_documents
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 5. Add policy to allow users to update their own generated documents (for file_url updates)
CREATE POLICY "Authenticated users can update their own generated documents"
ON public.generated_documents
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Block all anonymous access to generated_documents
CREATE POLICY "Block anonymous access to generated_documents"
ON public.generated_documents
FOR ALL
TO anon
USING (false);

-- 7. Strengthen document_templates policies
DROP POLICY IF EXISTS "Anyone can view templates" ON public.document_templates;
DROP POLICY IF EXISTS "Authenticated users can create templates" ON public.document_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.document_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.document_templates;

-- Only authenticated users can view templates
CREATE POLICY "Authenticated users can view templates"
ON public.document_templates
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create templates"
ON public.document_templates
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own templates"
ON public.document_templates
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own templates"
ON public.document_templates
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Block anonymous access to document_templates
CREATE POLICY "Block anonymous access to document_templates"
ON public.document_templates
FOR ALL
TO anon
USING (false);

-- 8. Strengthen template_parameters policies
DROP POLICY IF EXISTS "Anyone can view parameters" ON public.template_parameters;
DROP POLICY IF EXISTS "Template owners can manage parameters" ON public.template_parameters;

-- Create security definer function to check template ownership
CREATE OR REPLACE FUNCTION public.is_template_owner(_template_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.document_templates
    WHERE id = _template_id
      AND created_by = _user_id
  )
$$;

-- Only authenticated users can view parameters
CREATE POLICY "Authenticated users can view parameters"
ON public.template_parameters
FOR SELECT
TO authenticated
USING (true);

-- Only template owners can manage parameters
CREATE POLICY "Template owners can insert parameters"
ON public.template_parameters
FOR INSERT
TO authenticated
WITH CHECK (public.is_template_owner(template_id, auth.uid()));

CREATE POLICY "Template owners can update parameters"
ON public.template_parameters
FOR UPDATE
TO authenticated
USING (public.is_template_owner(template_id, auth.uid()))
WITH CHECK (public.is_template_owner(template_id, auth.uid()));

CREATE POLICY "Template owners can delete parameters"
ON public.template_parameters
FOR DELETE
TO authenticated
USING (public.is_template_owner(template_id, auth.uid()));

-- Block anonymous access to template_parameters
CREATE POLICY "Block anonymous access to template_parameters"
ON public.template_parameters
FOR ALL
TO anon
USING (false);

-- 9. Add validation function for generated_documents parameters (optional but recommended)
CREATE OR REPLACE FUNCTION public.validate_document_parameters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure parameters is not null
  IF NEW.parameters IS NULL THEN
    RAISE EXCEPTION 'Parameters cannot be null';
  END IF;
  
  -- Ensure parameters is a valid JSON object
  IF jsonb_typeof(NEW.parameters) != 'object' THEN
    RAISE EXCEPTION 'Parameters must be a JSON object';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for parameter validation
DROP TRIGGER IF EXISTS validate_parameters_before_insert ON public.generated_documents;
CREATE TRIGGER validate_parameters_before_insert
  BEFORE INSERT OR UPDATE ON public.generated_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_document_parameters();