import supabase from '../../src/providers/supabase/supabaseClient';

describe('Supabase Connection', () => {

  test('debe conectarse correctamente a Supabase', async () => {

    const { error } = await supabase
      .from('maestroArticulo')
      .select('item')
      .limit(1);

    expect(error).toBeNull();

  });

});