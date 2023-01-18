#include "Converter.hpp"
#include "Grid.hpp"


namespace sdfield {


Converter::Converter( const img_size_t& cov_size,
                      sdf_ext_t          sdf_ext )
    : cov_image_{ cov_size },
      sdf_image_{ cov_size, sdf_ext },
      sdf_ext_{ sdf_ext }
{}


const SdfImage::pixel_t*
Converter::build_sdf()
{
    const Grid grid { cov_image_, sdf_image_, sdf_ext_ };

    return sdf_image_.data();
}


} // namespace sdfield
